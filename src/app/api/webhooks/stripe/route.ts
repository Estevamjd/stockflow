import { stripe } from "@/lib/stripe";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { SubscriptionStatus, PlanName, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/rate-limit";
import type Stripe from "stripe";

/**
 * Webhook do Stripe.
 *
 * Eventos tratados:
 *   - checkout.session.completed
 *   - customer.subscription.created/updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed (suspende com PAST_DUE)
 *
 * SEMPRE valida a assinatura HMAC com `STRIPE_WEBHOOK_SECRET`.
 * Em caso de falha, responde 400 — o Stripe re-tenta automaticamente.
 *
 * Idempotência: Stripe garante re-entrega do mesmo `event.id` em
 * retries, "resend" do dashboard, etc. Usamos `BillingEvent.externalId`
 * com `@@unique([gateway, externalId])` como chave de idempotência.
 *
 * Sanitização: o payload bruto do Stripe contém `customer.email`,
 * `billing_details.address`, `payment_method.card.last4`, etc — dados
 * pessoais sensíveis. Persistimos APENAS um subset whitelisted no DB.
 */
function sanitizeStripePayload(
  obj: Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice
): Prisma.InputJsonValue {
  // Whitelist mínima — suficiente para auditoria/debug, sem PII.
  // Convertemos via unknown porque os tipos do Stripe têm índices
  // restritos que não casam com Record<string, unknown> diretamente.
  const o = obj as unknown as Record<string, unknown>;
  return {
    id: (o.id as string | undefined) ?? null,
    object: (o.object as string | undefined) ?? null,
    status: (o.status as string | undefined) ?? null,
    amount:
      (o.amount_total as number | undefined) ??
      (o.amount_due as number | undefined) ??
      null,
    currency: (o.currency as string | undefined) ?? null,
    metadata: (o.metadata as Record<string, string> | undefined) ?? null,
    created: (o.created as number | undefined) ?? null,
  };
}
export async function POST(req: Request) {
  // Rate limit por IP: webhooks legítimos do Stripe vêm dos IPs deles
  // (faixa documentada). 60 req/min é folgado pra burst legítimo e
  // bloqueia spam de uma origem maliciosa que conhece o secret hipotético.
  const limited = applyRateLimit("webhook-stripe", req, { limit: 60, windowMs: 60_000 });
  if (limited) return limited as NextResponse;

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET ausente — recusando webhooks Stripe");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logger.warn({ err }, "[Stripe Webhook] Assinatura inválida");
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // ─── Idempotência ────────────────────────────────────────────
  // Se já temos um BillingEvent com este event.id (e gateway 'stripe'),
  // o Stripe está re-entregando — respondemos 200 sem re-processar.
  const alreadyProcessed = await prisma.billingEvent.findUnique({
    where: {
      gateway_externalId: { gateway: "stripe", externalId: event.id },
    },
    select: { id: true },
  });
  if (alreadyProcessed) {
    logger.info(
      { eventId: event.id, type: event.type },
      "[Stripe Webhook] Evento duplicado ignorado (idempotente)"
    );
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, event.id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, event.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, event.id);
        break;
      }
      default:
        // Não é erro: muitos eventos são ignorados de propósito.
        logger.debug({ type: event.type }, "[Stripe Webhook] Evento ignorado");
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "[Stripe Webhook] Falha ao processar evento");
    // Retorna 500 para o Stripe re-tentar.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Extrai o período de uma Subscription do Stripe.
 * No SDK novo, `current_period_*` ficam dentro de `items.data[0]`.
 */
function getPeriodDates(subscription: Stripe.Subscription): { start: Date; end: Date } {
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`Stripe subscription ${subscription.id} sem items`);
  }
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const tenantId = session.metadata?.tenantId;
  const planFromMetadata = session.metadata?.plan;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!tenantId || !stripeSubscriptionId || !stripeCustomerId) {
    logger.warn({ sessionId: session.id }, "[Stripe Webhook] checkout.session.completed sem metadados completos");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const { start, end } = getPeriodDates(subscription);
  const plan = (planFromMetadata as PlanName) || "FREE";

  await prisma.subscription.upsert({
    where: { tenantId },
    update: {
      stripeSubscriptionId,
      stripeCustomerId,
      status: mapStripeStatus(subscription.status),
      plan,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
    create: {
      tenantId,
      stripeSubscriptionId,
      stripeCustomerId,
      status: mapStripeStatus(subscription.status),
      plan,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });

  await prisma.billingEvent.create({
    data: {
      tenantId,
      type: "SUBSCRIPTION_CREATED",
      gateway: "stripe",
      externalId: eventId,
      status: "processed",
      payload: sanitizeStripePayload(session),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) {
    logger.warn({ stripeSubscriptionId: subscription.id }, "[Stripe Webhook] Subscription updated sem registro local");
    return;
  }

  const { start, end } = getPeriodDates(subscription);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string
) {
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELED",
      plan: "FREE",
      canceledAt: new Date(),
    },
  });

  await prisma.billingEvent.create({
    data: {
      tenantId: sub.tenantId,
      type: "SUBSCRIPTION_CANCELED",
      gateway: "stripe",
      externalId: eventId,
      status: "processed",
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice, eventId: string) {
  const stripeSubscriptionId =
    typeof (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription === "string"
      ? ((invoice as Stripe.Invoice & { subscription: string }).subscription)
      : ((invoice as Stripe.Invoice & { subscription?: Stripe.Subscription }).subscription?.id);

  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "PAST_DUE" },
  });

  await prisma.billingEvent.create({
    data: {
      tenantId: sub.tenantId,
      type: "PAYMENT_FAILED",
      gateway: "stripe",
      externalId: eventId,
      amount: invoice.amount_due ? invoice.amount_due / 100 : null,
      status: "processed",
      payload: sanitizeStripePayload(invoice),
    },
  });
}

/**
 * Mapeamento explícito Stripe → SubscriptionStatus do Prisma.
 *
 * IMPORTANTE: `past_due` MAPEIA PARA `PAST_DUE`, não para `PAID` (bug histórico).
 * Receita de cliente em atraso DEVE ser refletida fielmente no nosso DB.
 */
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
    case "incomplete_expired":
      return "INCOMPLETE";
    default:
      return "INCOMPLETE";
  }
}
