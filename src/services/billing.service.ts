import { stripe } from "@/lib/stripe";
import prisma from "@/lib/db";
import { AppError } from "@/lib/errors";
import { PlanName } from "@prisma/client";

export class BillingService {
  static async createCheckoutSession(tenantId: string, plan: PlanName) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true, users: true },
    });

    if (!tenant) throw new AppError("Tenant não encontrado", 404);

    // Mapear planos para IDs de Preço do Stripe (definidos no Dashboard do Stripe)
    const priceIds: Record<PlanName, string | undefined> = {
      FREE: undefined,
      STARTER: process.env.STRIPE_PRICE_STARTER,
      PRO: process.env.STRIPE_PRICE_PRO,
      ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
    };

    const priceId = priceIds[plan];
    if (!priceId) throw new AppError("Plano inválido ou não configurado para Stripe", 400);

    const session = await stripe.checkout.sessions.create({
      customer: tenant.subscription?.stripeCustomerId ?? undefined,
      customer_email: !tenant.subscription?.stripeCustomerId ? tenant.users[0]?.email : undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings/billing?canceled=true`,
      metadata: { tenantId, plan },
      subscription_data: {
        metadata: { tenantId, plan },
      },
    });

    return { url: session.url };
  }

  static async createPortalSession(tenantId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new AppError("Nenhuma conta Stripe vinculada a este tenant.", 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/settings/billing`,
    });

    return { url: session.url };
  }
}
