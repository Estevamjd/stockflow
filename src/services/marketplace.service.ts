import prisma from "@/lib/db";
import { ShopeeSyncService } from "@/lib/shopee/sync.service";
import { createShopeeClient } from "@/lib/shopee/real-client";
import { logger } from "@/lib/logger";
import type { WebhookEvent } from "@prisma/client";

/**
 * Shape mínimo de payload da Shopee que processamos.
 * Fields opcionais porque vêm de JSON externo.
 */
interface ShopeeWebhookPayload {
  data?: {
    ordersn?: string;
    item_list?: Array<{
      item_id: number | string;
      normal_stock: number;
    }>;
  };
}

function asShopeePayload(value: unknown): ShopeeWebhookPayload | null {
  if (value && typeof value === "object") return value as ShopeeWebhookPayload;
  return null;
}

export class MarketplaceService {
  /**
   * Processa um evento de webhook que estava na fila
   */
  static async processWebhookEvent(event: WebhookEvent): Promise<void> {
    const { id, tenantId, source, eventType } = event;
    const payload = asShopeePayload(event.payload);

    try {
      if (source === "SHOPEE") {
        if (eventType === "3" && payload?.data?.ordersn) {
          const client = createShopeeClient(tenantId);
          // O getOrderDetail dentro do ShopeeSyncService ou client tem retry interno.
          const order = await client.getOrderDetail(payload.data.ordersn);
          const result = await ShopeeSyncService.processSingleOrder(order, tenantId);

          await prisma.webhookEvent.update({
            where: { id },
            data: {
              status: result.processed ? "PROCESSED" : "SKIPPED",
              processedAt: new Date(),
              errorMessage: result.error || null,
            },
          });
        } else if (eventType === "10" && payload?.data?.item_list) {
          for (const item of payload.data.item_list) {
            const product = await prisma.product.findFirst({
              where: { tenantId, shopeeProductId: String(item.item_id), deletedAt: null },
            });
            if (product) {
              await prisma.product.update({
                where: { id: product.id },
                data: { stockQuantity: item.normal_stock },
              });
            }
          }
          await prisma.webhookEvent.update({
            where: { id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
        } else {
          // Evento não mapeado
          await prisma.webhookEvent.update({
            where: { id },
            data: { status: "SKIPPED", processedAt: new Date() },
          });
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      logger.error({ err, eventId: id }, "Erro processando webhook no MarketplaceService");
      await prisma.webhookEvent.update({
        where: { id },
        data: {
          status: "ERROR",
          errorMessage: errorMsg,
        },
      });
      throw err;
    }
  }
}
