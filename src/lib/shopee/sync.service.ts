import prisma from "@/lib/db";
import { createShopeeClient } from "./real-client";
import { SaleService } from "@/services/sale.service";
import { NotificationService } from "@/services/notification.service";
import type { ShopeeOrder } from "./types";

export class ShopeeSyncService {
  static async checkForDuplicates(orderId: string, tenantId: string): Promise<boolean> {
    const existing = await prisma.sale.findFirst({
      where: { tenantId, externalOrderId: orderId },
      select: { id: true },
    });
    return !!existing;
  }

  static async processSingleOrder(
    order: ShopeeOrder,
    tenantId: string
  ): Promise<{ processed: boolean; saleId?: string; error?: string }> {
    const validStatuses = ["READY_TO_SHIP", "SHIPPED", "COMPLETED"];
    if (!validStatuses.includes(order.order_status)) {
      return { processed: false };
    }

    const isDuplicate = await this.checkForDuplicates(order.order_sn, tenantId);
    if (isDuplicate) {
      return { processed: false };
    }

    // Mapear itens Shopee para produtos locais via SKU
    const saleItems = [];
    for (const item of order.item_list) {
      const sku = item.model_sku || item.item_sku;
      const product = await prisma.product.findFirst({
        where: { tenantId, sku, deletedAt: null },
        select: { id: true, stockQuantity: true },
      });

      if (!product) {
        console.warn(`[ShopeeSync] SKU não encontrado: ${sku} — ignorando item`);
        continue;
      }

      saleItems.push({
        productId: product.id,
        quantity: item.model_quantity_purchased,
        unitPrice: item.model_discounted_price,
      });
    }

    if (saleItems.length === 0) {
      return { processed: false, error: "Nenhum produto local encontrado para os itens" };
    }

    try {
      const sale = await SaleService.createSale(
        {
          channel: "SHOPEE",
          externalOrderId: order.order_sn,
          customerName: order.recipient_address?.name ?? order.buyer_username,
          items: saleItems,
          saleDate: new Date(order.create_time * 1000),
          status: order.order_status === "COMPLETED" ? "DELIVERED" : "SHIPPED",
        },
        tenantId
      );
      return { processed: true, saleId: sale.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      return { processed: false, error: msg };
    }
  }

  static async syncOrders(tenantId: string): Promise<{
    processed: number;
    skipped: number;
    errors: number;
  }> {
    const client = createShopeeClient(tenantId);

    let cursor: string | undefined;
    let hasNextPage = true;
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // Atualizar lastSyncAt
    const syncStart = new Date();

    while (hasNextPage) {
      const response = await client.getOrders({
        time_range_field: "update_time",
        time_from: Math.floor((Date.now() - 86400 * 7 * 1000) / 1000),
        time_to: Math.floor(Date.now() / 1000),
        cursor,
        page_size: 50,
      });

      for (const order of response.orders) {
        const result = await this.processSingleOrder(order, tenantId);
        if (result.processed) processed++;
        else if (result.error) errors++;
        else skipped++;
      }

      hasNextPage = response.has_next_page;
      cursor = response.next_cursor;
    }

    // Atualizar config de integração
    await prisma.integrationConfig.updateMany({
      where: { tenantId, type: "SHOPEE" },
      data: { lastSyncAt: syncStart },
    });

    if (errors > 0) {
      await NotificationService.createIntegrationErrorNotification(
        tenantId,
        `Sincronização Shopee: ${errors} pedido(s) com erro, ${processed} processados.`
      );
    }

    return { processed, skipped, errors };
  }
}
