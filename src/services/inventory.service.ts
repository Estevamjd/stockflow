import prisma from "@/lib/db";
import type { StockEntryInput } from "@/types";
import type { Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { ProductService } from "./product.service";

export class InventoryService {
  static async createStockEntry(
    data: StockEntryInput,
    tenantId: string,
    userId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Buscar produto com lock
      const product = await tx.product.findFirst({
        where: { id: data.productId, tenantId, deletedAt: null },
      });
      if (!product) throw new Error("Produto não encontrado");

      const currentQty = product.stockQuantity;
      const currentCost = Number(product.costPrice);

      // Custo Médio Ponderado (CMP)
      const newCMP =
        currentQty === 0
          ? data.unitCost
          : (currentQty * currentCost + data.quantity * data.unitCost) /
            (currentQty + data.quantity);

      const totalCost = data.quantity * data.unitCost;

      // Criar registro de entrada
      const entry = await tx.stockEntry.create({
        data: {
          tenantId,
          productId: data.productId,
          userId,
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost,
          averageCostAfter: newCMP,
          supplier: data.supplier,
          notes: data.notes,
          entryDate: data.entryDate ?? new Date(),
        },
      });

      // Atualizar produto: estoque e custo médio.
      // updateMany com tenantId no where: defense in depth.
      const upd = await tx.product.updateMany({
        where: { id: data.productId, tenantId, deletedAt: null },
        data: {
          stockQuantity: { increment: data.quantity },
          costPrice: newCMP,
          profitMargin:
            Number(product.salePrice) > 0
              ? ((Number(product.salePrice) - newCMP) /
                  Number(product.salePrice)) *
                100
              : 0,
        },
      });
      if (upd.count === 0) {
        throw new AppError("Produto não encontrado", 404, ErrorCodes.NOT_FOUND);
      }

      // Log
      await tx.activityLog.create({
        data: {
          tenantId,
          userId,
          action: "STOCK_ENTRY",
          entity: "StockEntry",
          entityId: entry.id,
          details: {
            productId: data.productId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            newCMP,
          },
        },
      });

      return entry;
    }).then(async (entry) => {
      // Verificar notificações de estoque (fora da transação)
      await ProductService.checkAndNotifyLowStock(data.productId, tenantId);
      return entry;
    });
  }

  static async processStockExit(
    data: {
      productId: string;
      quantity: number;
      saleItemId?: string;
      reason?: string;
      referenceId?: string;
      notes?: string;
    },
    tenantId: string,
    tx: Prisma.TransactionClient
  ) {
    // Decremento condicional atômico: usar updateMany permite incluir
    // `stockQuantity: { gte: data.quantity }` no WHERE. O Postgres
    // executa SELECT/UPDATE no mesmo statement, então duas vendas
    // concorrentes do último item nunca conseguem ambas decrementar
    // o estoque para um valor negativo. Quem perde a corrida recebe
    // count=0 e levanta erro de estoque insuficiente.
    const decremented = await tx.product.updateMany({
      where: {
        id: data.productId,
        tenantId,
        deletedAt: null,
        stockQuantity: { gte: data.quantity },
      },
      data: { stockQuantity: { decrement: data.quantity } },
    });

    if (decremented.count === 0) {
      const product = await tx.product.findFirst({
        where: { id: data.productId, tenantId },
        select: { name: true, stockQuantity: true },
      });
      if (!product) {
        throw new AppError(
          `Produto ${data.productId} não encontrado`,
          404,
          ErrorCodes.NOT_FOUND
        );
      }
      throw new AppError(
        `Estoque insuficiente para "${product.name}": disponível ${product.stockQuantity}, solicitado ${data.quantity}`,
        409,
        ErrorCodes.CONFLICT
      );
    }

    // Lê o produto pós-decremento para registrar o custo no momento da saída.
    const product = await tx.product.findFirst({
      where: { id: data.productId, tenantId },
      select: { costPrice: true },
    });

    const exit = await tx.stockExit.create({
      data: {
        tenantId,
        productId: data.productId,
        saleItemId: data.saleItemId,
        quantity: data.quantity,
        costAtExit: product?.costPrice ?? 0,
        reason: data.reason ?? "SALE",
        referenceId: data.referenceId,
        notes: data.notes,
      },
    });

    return exit;
  }

  static async getStockEntries(
    tenantId: string,
    options?: {
      productId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { productId, from, to, page = 1, limit = 20 } = options ?? {};

    const where: Prisma.StockEntryWhereInput = {
      tenantId,
      ...(productId ? { productId } : {}),
      ...(from || to
        ? {
            entryDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [entries, total] = await prisma.$transaction([
      prisma.stockEntry.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
        orderBy: { entryDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockEntry.count({ where }),
    ]);

    return { entries, total };
  }

  static async getStockExits(
    tenantId: string,
    options?: {
      productId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const { productId, from, to, page = 1, limit = 20 } = options ?? {};

    const where: Prisma.StockExitWhereInput = {
      tenantId,
      ...(productId ? { productId } : {}),
      ...(from || to
        ? {
            exitDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [exits, total] = await prisma.$transaction([
      prisma.stockExit.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
        orderBy: { exitDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockExit.count({ where }),
    ]);

    return { exits, total };
  }

  static async getStats(tenantId: string) {
    const products = await prisma.product.findMany({
      where: { tenantId, deletedAt: null, status: "ACTIVE" },
      select: {
        stockQuantity: true,
        minStockLevel: true,
        costPrice: true,
      },
    });

    const totalUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
    const totalValue = products.reduce(
      (sum, p) => sum + p.stockQuantity * Number(p.costPrice),
      0
    );
    const lowStockCount = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockLevel
    ).length;
    const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

    return { totalUnits, totalValue, lowStockCount, outOfStockCount };
  }
}
