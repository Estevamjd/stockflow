import prisma from "@/lib/db";
import type { SaleReportFilters, TopProduct } from "@/types";

export class ReportService {
  static async getSalesReport(tenantId: string, filters: SaleReportFilters) {
    const { from, to, channel, status } = filters;

    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        ...(channel ? { channel: channel as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(from || to
          ? {
              saleDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { saleDate: "desc" },
    });

    // Flatten: uma linha por item de venda
    const rows = sales.flatMap((sale) =>
      sale.items.map((item) => ({
        "ID Venda": sale.id,
        Data: new Date(sale.saleDate).toLocaleDateString("pt-BR"),
        Canal: sale.channel,
        "Pedido Externo": sale.externalOrderId ?? "",
        Cliente: sale.customerName ?? "",
        Produto: item.product.name,
        SKU: item.product.sku,
        Quantidade: item.quantity,
        "Preço Unit.": Number(item.unitPrice).toFixed(2),
        "Total Item": Number(item.totalPrice).toFixed(2),
        Status: sale.status,
      }))
    );

    return rows;
  }

  static async getInventoryReport(tenantId: string) {
    const products = await prisma.product.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return products.map((p) => ({
      ID: p.id,
      Nome: p.name,
      SKU: p.sku,
      Categoria: p.category?.name ?? "Sem categoria",
      "Estoque Atual": p.stockQuantity,
      "Estoque Mínimo": p.minStockLevel,
      "Preço Venda": Number(p.salePrice).toFixed(2),
      "Custo Médio": Number(p.costPrice).toFixed(2),
      "Margem (%)": Number(p.profitMargin).toFixed(1),
      Unidade: p.unit,
      Status: p.status,
    }));
  }

  static async getTopProducts(
    tenantId: string,
    options?: { limit?: number; from?: string; to?: string }
  ): Promise<TopProduct[]> {
    const { limit = 10, from, to } = options ?? {};

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          status: { notIn: ["CANCELLED", "REFUNDED"] },
          ...(from || to
            ? {
                saleDate: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    // Agrupar por produto
    const byProduct = new Map<
      string,
      { productId: string; productName: string; sku: string; totalQuantity: number; totalRevenue: number }
    >();

    for (const item of saleItems) {
      const key = item.productId;
      if (!byProduct.has(key)) {
        byProduct.set(key, {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          totalQuantity: 0,
          totalRevenue: 0,
        });
      }
      const existing = byProduct.get(key)!;
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += Number(item.totalPrice);
    }

    return Array.from(byProduct.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }
}
