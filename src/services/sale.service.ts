import prisma from "@/lib/db";
import type { CreateSaleInput, SaleWithItems } from "@/types";
import { planEnforcer } from "@/lib/plans/plan-enforcer";
import { AppError, ErrorCodes } from "@/lib/errors";
import { saleSchema } from "@/lib/validations";
import { InventoryService } from "./inventory.service";
import { NotificationService } from "./notification.service";
import { ProductService } from "./product.service";
import { safePercentage } from "@/utils/math";
import type { Prisma } from "@prisma/client";

export class SaleService {
  static async createSale(
    data: CreateSaleInput,
    tenantId: string,
    userId?: string
  ): Promise<SaleWithItems> {
    try {
      const validated = saleSchema.parse(data);
      
      await planEnforcer.checkSalesMonthLimit(tenantId);

      // Pré-check leve: só para mensagem de erro amigável mais cedo.
      // A validação definitiva acontece no decremento condicional atômico
      // dentro de InventoryService.processStockExit — dois callers
      // concorrentes do último item nunca conseguem vender abaixo de zero.
      for (const item of validated.items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, tenantId, deletedAt: null },
          select: { id: true },
        });
        if (!product) {
          throw new AppError(
            `Produto ${item.productId} não encontrado`,
            404,
            ErrorCodes.NOT_FOUND
          );
        }
      }

      const sale = await prisma.$transaction(async (tx) => {
        // Idempotência
        if (validated.externalOrderId) {
          const existingSale = await tx.sale.findFirst({
            where: { tenantId, externalOrderId: validated.externalOrderId },
          });
          if (existingSale) {
            throw new AppError(`Venda ${validated.externalOrderId} já processada.`, 409, ErrorCodes.IDEMPOTENCY_CONFLICT);
          }
        }

        // Calcular totais
        let subtotal = 0;
        type SaleItemRow = {
          productId: string;
          quantity: number;
          unitPrice: number;
          unitCost: number;
          totalPrice: number;
          profit: number;
        };
        const saleItemsData: SaleItemRow[] = [];

        for (const item of validated.items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId },
            select: { costPrice: true, name: true },
          });
          if (!product) throw new Error(`Produto não encontrado: ${item.productId}`);

          const unitCost = Number(product.costPrice);
          const totalPrice = item.quantity * item.unitPrice;
          const profit = totalPrice - (item.quantity * unitCost);
          subtotal += totalPrice;

          saleItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost,
            totalPrice,
            profit,
          });
        }

        const discount = validated.discount ?? 0;
        const shippingCost = validated.shippingCost ?? 0;
        const totalAmount = subtotal - discount + shippingCost;
        const totalProfit = saleItemsData.reduce((sum, i) => sum + i.profit, 0) - discount;

        // Criar a venda
        const newSale = await tx.sale.create({
          data: {
            tenantId,
            userId,
            channel: validated.channel,
            externalOrderId: validated.externalOrderId,
            customerName: validated.customerName,
            customerEmail: validated.customerEmail,
            subtotal,
            discount,
            shippingCost,
            totalAmount,
            totalCost: subtotal - totalProfit,
            profit: totalProfit,
            status: validated.status,
            notes: validated.notes,
            saleDate: validated.saleDate ?? new Date(),
            items: { create: saleItemsData },
          },
          include: {
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        });

      // Baixar estoque para cada item
      for (const item of saleItemsData) {
        const saleItem = newSale.items.find((i) => i.productId === item.productId);
        await InventoryService.processStockExit(
          {
            productId: item.productId,
            quantity: item.quantity,
            saleItemId: saleItem?.id,
            reason: "SALE",
            referenceId: newSale.id,
          },
          tenantId,
          tx
        );
      }

      // Log de atividade
      await tx.activityLog.create({
        data: {
          tenantId,
          userId,
          action: "CREATE_SALE",
          entity: "Sale",
          entityId: newSale.id,
          details: {
            channel: newSale.channel,
            totalAmount: totalAmount,
            itemCount: data.items.length,
          },
        },
      });

      return {
        ...newSale,
        subtotal: Number(newSale.subtotal),
        discount: Number(newSale.discount),
        shippingCost: Number(newSale.shippingCost),
        totalAmount: Number(newSale.totalAmount),
        totalCost: Number(newSale.totalCost),
        profit: Number(newSale.profit),
        items: newSale.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          unitCost: Number(i.unitCost),
          totalPrice: Number(i.totalPrice),
          profit: Number(i.profit),
        })),
      } as SaleWithItems;
    });

    // Notificações e verificações de estoque (fora da transação)
    try {
      await NotificationService.createNewSaleNotification(tenantId, {
        id: sale.id,
        totalAmount: Number(sale.totalAmount),
        channel: sale.channel,
        customerName: sale.customerName,
      });

      for (const item of data.items) {
        await ProductService.checkAndNotifyLowStock(item.productId, tenantId);
      }
    } catch (e) {
      console.error("⚠️ Falha em ações pós-venda:", e);
    }

    return sale;
   } catch (error) {
     if (error instanceof AppError) throw error;
     console.error("❌ Erro ao criar venda:", error);
     throw new AppError("Erro interno ao processar venda.", 500);
   }
  }

  static async getSales(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      channel?: string;
      status?: string;
      from?: Date;
      to?: Date;
      search?: string;
    }
  ) {
    const { page = 1, limit = 20, channel, status, from, to, search } = options ?? {};

    const where: Prisma.SaleWhereInput = {
      tenantId,
      ...(channel ? { channel: channel as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(from || to
        ? {
            saleDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" } },
              { externalOrderId: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [sales, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { saleDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return {
      sales: sales.map((s) => ({
        ...s,
        subtotal: Number(s.subtotal),
        discount: Number(s.discount),
        shippingCost: Number(s.shippingCost),
        totalAmount: Number(s.totalAmount),
        totalCost: Number(s.totalCost),
        profit: Number(s.profit),
        items: s.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          unitCost: Number(i.unitCost),
          totalPrice: Number(i.totalPrice),
          profit: Number(i.profit),
        })),
      })),
      total,
    };
  }

  static async getSaleById(id: string, tenantId: string): Promise<SaleWithItems | null> {
    const sale = await prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
    if (!sale) return null;
    return {
      ...sale,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      shippingCost: Number(sale.shippingCost),
      totalAmount: Number(sale.totalAmount),
      totalCost: Number(sale.totalCost),
      profit: Number(sale.profit),
      items: sale.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        unitCost: Number(i.unitCost),
        totalPrice: Number(i.totalPrice),
        profit: Number(i.profit),
      })),
    } as SaleWithItems;
  }

  static async getSalesStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfDay = new Date(now.toDateString());

    const [monthSales, prevMonthSales, todaySales] = await prisma.$transaction([
      prisma.sale.aggregate({
        where: { tenantId, saleDate: { gte: startOfMonth }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _sum: { totalAmount: true, profit: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: {
          tenantId,
          saleDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
        _sum: { totalAmount: true, profit: true },
      }),
      prisma.sale.count({
        where: { tenantId, saleDate: { gte: startOfDay } },
      }),
    ]);

    const monthlyRevenue = Number(monthSales._sum.totalAmount ?? 0);
    const prevMonthlyRevenue = Number(prevMonthSales._sum.totalAmount ?? 0);
    const monthlyProfit = Number(monthSales._sum.profit ?? 0);
    const prevMonthlyProfit = Number(prevMonthSales._sum.profit ?? 0);

    const revenueChange = safePercentage(monthlyRevenue - prevMonthlyRevenue, prevMonthlyRevenue);
    const profitChange = safePercentage(monthlyProfit - prevMonthlyProfit, prevMonthlyProfit);

    return {
      monthlyRevenue,
      monthlyProfit,
      todaySales,
      monthSalesCount: monthSales._count,
      revenueChange,
      profitChange,
    };
  }

  // Dados dos últimos 30 dias para o gráfico
  static async getRevenueChartData(tenantId: string) {
    const days = 30;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        saleDate: { gte: from },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      select: { saleDate: true, totalAmount: true, profit: true },
      orderBy: { saleDate: "asc" },
    });

    // Agrupar por data
    const byDate = new Map<string, { revenue: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split("T")[0];
      byDate.set(key, { revenue: 0, profit: 0 });
    }

    for (const s of sales) {
      const key = new Date(s.saleDate).toISOString().split("T")[0];
      if (byDate.has(key)) {
        const existing = byDate.get(key)!;
        existing.revenue += Number(s.totalAmount);
        existing.profit += Number(s.profit);
      }
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      profit: data.profit,
    }));
  }

  static async getChannelDistribution(tenantId: string) {
    const result = await prisma.sale.groupBy({
      by: ["channel"],
      where: {
        tenantId,
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    return result.map((r) => ({
      channel: r.channel,
      count: r._count,
      revenue: Number(r._sum.totalAmount ?? 0),
    }));
  }
}
