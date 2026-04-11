import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getTenantByShopId } from "@/lib/tenant";
import type { WebhookPayload } from "@/lib/shopee/types";
import { logger } from "@/lib/logger";
import { planEnforcer } from "@/lib/plans/plan-enforcer";
import { Prisma } from "@prisma/client";

/**
 * Webhook da Shopee.
 *
 * Regras de segurança:
 *  - SHOPEE_WEBHOOK_SECRET é obrigatório. Sem ele responde 503 (não 200)
 *    para não silenciar a falha de configuração.
 *  - Header `authorization` é obrigatório. Sem ele rejeita 401.
 *  - Assinatura HMAC-SHA256 é validada via timing-safe compare.
 *  - `shopid` desconhecido NÃO cai em "primeiro tenant do banco".
 *    Bug histórico crítico: o fallback antigo gravava webhooks de
 *    qualquer loja não cadastrada no primeiro tenant existente,
 *    contaminando dados de outros clientes.
 *
 * O processamento real do evento é feito de forma assíncrona pelo
 * cron `/api/cron/process-webhooks` (lê WebhookEvent.status='PENDING').
 * Aqui só validamos, enfileiramos e respondemos 200 rápido — padrão
 * exigido pela própria Shopee Open Platform.
 */
function verifyShopeeSignature(
  webhookSecret: string,
  rawPayload: string,
  signature: string
): boolean {
  try {
    const computed = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.SHOPEE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("SHOPEE_WEBHOOK_SECRET ausente — recusando webhooks Shopee");
    return NextResponse.json(
      { success: false, error: "Service unavailable" },
      { status: 503 }
    );
  }

  const rawPayload = await req.text();
  const authorization = req.headers.get("authorization");
  const shopId = req.headers.get("shopid") ?? req.headers.get("shop_id");

  if (!authorization) {
    return NextResponse.json(
      { success: false, error: "Missing signature" },
      { status: 401 }
    );
  }
  if (!shopId) {
    return NextResponse.json(
      { success: false, error: "Missing shop id" },
      { status: 400 }
    );
  }

  const isValid = verifyShopeeSignature(webhookSecret, rawPayload, authorization);
  if (!isValid) {
    logger.warn({ shopId }, "[Shopee Webhook] Assinatura inválida");
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Resolver tenant via shopId. Sem fallback "pega o primeiro" — esse era o bug.
  const tenantId = await getTenantByShopId(shopId);
  if (!tenantId) {
    logger.warn({ shopId }, "[Shopee Webhook] Shop não cadastrado no StockFlow");
    return NextResponse.json(
      { success: false, error: "Shop not registered" },
      { status: 404 }
    );
  }

  // Parse do JSON depois de validar assinatura — não vaza erro de parse
  // antes de saber que a chamada é legítima.
  let parsedPayload: WebhookPayload;
  try {
    parsedPayload = JSON.parse(rawPayload) as WebhookPayload;
  } catch (err) {
    logger.error({ err, shopId }, "[Shopee Webhook] Payload JSON inválido");
    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    await planEnforcer.checkIntegrationLimit(tenantId);

    await prisma.webhookEvent.create({
      data: {
        tenantId,
        source: "SHOPEE",
        eventType: String(parsedPayload.code ?? "unknown"),
        payload: parsedPayload as unknown as Prisma.InputJsonValue,
        status: "PENDING",
      },
    });

    logger.info(
      { tenantId, code: parsedPayload.code },
      "[Shopee Webhook] Evento enfileirado"
    );
  } catch (err) {
    logger.error({ err, tenantId }, "[Shopee Webhook] Erro ao enfileirar evento");
    // Mesmo em erro interno, NÃO retornamos 500 para a Shopee — ela
    // re-tenta agressivamente. Logamos e devolvemos 200; o cron pega
    // novamente quando o problema for resolvido (ele não lê eventos
    // que falharam ao enfileirar — eles nunca foram criados).
    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
