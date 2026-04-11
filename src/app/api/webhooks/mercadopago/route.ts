import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/logger";

/**
 * Webhook do MercadoPago.
 *
 * Validação de assinatura segue o padrão do MP:
 *   header `x-signature: ts=<timestamp>,v1=<hash>`
 *   header `x-request-id: <uuid>`
 *
 * O hash é HMAC-SHA256 de:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * Estado atual da integração: ESQUELETO. O fluxo completo (resolução
 * de tenant via metadata, busca do payment, atualização da Subscription)
 * está mapeado para a Fase 3. Aqui:
 *   - Validamos assinatura (P0 — vulnerabilidade #8 do raio-X)
 *   - Enfileiramos o evento bruto em BillingEvent para auditoria
 *   - Respondemos 200 rápido (MP é re-tentador agressivo)
 */
function verifyMpSignature(
  secret: string,
  signatureHeader: string,
  requestId: string,
  dataId: string
): boolean {
  // Parse header `ts=...,v1=...`
  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.trim().split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface MpWebhookBody {
  action?: string;
  type?: string;
  data?: { id?: string };
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("MERCADOPAGO_WEBHOOK_SECRET ausente — recusando webhooks MP");
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }

  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signature || !requestId) {
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 401 }
    );
  }

  let body: MpWebhookBody;
  try {
    body = (await req.json()) as MpWebhookBody;
  } catch (err) {
    logger.error({ err }, "[MercadoPago Webhook] Payload inválido");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const dataId = body.data?.id;
  if (!dataId) {
    return NextResponse.json({ error: "Missing data.id" }, { status: 400 });
  }

  const isValid = verifyMpSignature(secret, signature, requestId, String(dataId));
  if (!isValid) {
    logger.warn({ requestId, dataId }, "[MercadoPago Webhook] Assinatura inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // TODO (Fase 3): resolver tenant via API do MP usando data.id → payment → metadata.tenantId
  // Por enquanto, não temos como mapear o evento a um tenant sem chamar a API,
  // então gravamos em uma tabela "global" de webhooks para auditoria/retry.
  //
  // Como BillingEvent exige tenantId, e não queremos contaminar nenhum tenant,
  // logamos e respondemos 200 — o evento será re-processado quando o fluxo
  // completo for implementado (cron com retry de eventos sem tenant).

  logger.info(
    { requestId, dataId, action: body.action, type: body.type },
    "[MercadoPago Webhook] Evento válido recebido (processamento na Fase 3)"
  );

  // Marca como recebido em uma futura tabela (a criar na Fase 3).
  // Por ora, log estruturado é suficiente para auditoria.

  return NextResponse.json({ received: true }, { status: 200 });
}
