import prisma from "@/lib/db";
import { calculateProfitMargin } from "@/lib/utils";
import type {
  ProductWithCategory,
  ProductFilters,
  CreateProductInput,
} from "@/types";
import { planEnforcer } from "@/lib/plans/plan-enforcer";
import type { Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { productSchema } from "@/lib/validations";
import { NotificationService } from "./notification.service";

export class ProductService {
  static async getProducts(
    filters: ProductFilters,
    tenantId: string
  ): Promise<{ products: ProductWithCategory[]; total: number; page: number; totalPages: number }> {
    const { search, category, lowStock, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : { status: "ACTIVE" }),
      ...(category ? { categoryId: category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const filtered = lowStock
      ? products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockLevel)
      : products;

    return {
      products: filtered.map((p) => ({
        ...p,
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
        profitMargin: Number(p.profitMargin),
      })) as ProductWithCategory[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getProductById(
    id: string,
    tenantId: string
  ): Promise<ProductWithCategory | null> {
    const product = await prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    if (!product) return null;

    return {
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      profitMargin: Number(product.profitMargin),
    } as ProductWithCategory;
  }

  static async createProduct(
    data: CreateProductInput,
    tenantId: string,
    userId?: string
  ): Promise<ProductWithCategory> {
    // Validar com Zod
    const validated = productSchema.parse(data);

    try {
      await planEnforcer.checkProductLimit(tenantId);

      // Verificar SKU único por tenant
      const existing = await prisma.product.findFirst({
        where: { tenantId, sku: validated.sku, deletedAt: null },
      });
      if (existing) throw new AppError("SKU já existe neste tenant", 409, ErrorCodes.CONFLICT);

      const profitMargin = calculateProfitMargin(validated.costPrice, validated.salePrice);

      const product = await prisma.product.create({
        data: {
          tenantId,
          name: validated.name,
          sku: validated.sku,
          categoryId: validated.categoryId,
          description: validated.description,
          costPrice: validated.costPrice,
          salePrice: validated.salePrice,
          profitMargin,
          stockQuantity: validated.stockQuantity ?? 0,
          minStockLevel: validated.minStockLevel ?? 5,
          unit: validated.unit ?? "un",
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
        },
      });

      // Log de atividade
      await prisma.activityLog.create({
        data: {
          tenantId,
          userId,
          action: "CREATE",
          entity: "Product",
          entityId: product.id,
          details: { name: product.name, sku: product.sku },
        },
      });

      return {
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        profitMargin: Number(product.profitMargin),
      } as ProductWithCategory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("❌ Erro ao criar produto:", error);
      throw new AppError("Erro interno ao criar produto.", 500);
    }
  }

  static async updateProduct(
    id: string,
    data: Partial<CreateProductInput>,
    tenantId: string,
    userId?: string
  ): Promise<ProductWithCategory> {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new AppError("Produto não encontrado", 404, ErrorCodes.NOT_FOUND);

    if (data.sku && data.sku !== existing.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { tenantId, sku: data.sku, deletedAt: null, id: { not: id } },
      });
      if (skuExists) throw new AppError("SKU já existe neste tenant", 409, ErrorCodes.CONFLICT);
    }

    const costPrice = data.costPrice ?? Number(existing.costPrice);
    const salePrice = data.salePrice ?? Number(existing.salePrice);
    const profitMargin = calculateProfitMargin(costPrice, salePrice);

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.sku ? { sku: data.sku } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.salePrice !== undefined ? { salePrice: data.salePrice } : {}),
        ...(data.minStockLevel !== undefined ? { minStockLevel: data.minStockLevel } : {}),
        ...(data.stockQuantity !== undefined ? { stockQuantity: data.stockQuantity } : {}),
        ...(data.unit ? { unit: data.unit } : {}),
        profitMargin,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        tenantId,
        userId,
        action: "UPDATE",
        entity: "Product",
        entityId: product.id,
        details: data as Prisma.InputJsonValue,
      },
    });

    return {
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      profitMargin: Number(product.profitMargin),
    } as ProductWithCategory;
  }

  static async deleteProduct(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<void> {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new AppError("Produto não encontrado", 404, ErrorCodes.NOT_FOUND);

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });

    await prisma.activityLog.create({
      data: {
        tenantId,
        userId,
        action: "DELETE",
        entity: "Product",
        entityId: id,
      },
    });
  }

  static async checkAndNotifyLowStock(
    productId: string,
    tenantId: string
  ): Promise<void> {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, sku: true, stockQuantity: true, minStockLevel: true },
    });
    if (!product) return;

    if (product.stockQuantity === 0) {
      // Verificar se já existe notificação de OUT_OF_STOCK recente (última hora)
      const recentNotif = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: "OUT_OF_STOCK",
          metadata: { path: ["productId"], equals: productId },
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });
      if (!recentNotif) {
        await NotificationService.createNotification({
          tenantId,
          type: "OUT_OF_STOCK",
          title: "Produto sem estoque",
          message: `O produto "${product.name}" (${product.sku}) está sem estoque.`,
          link: `/products/${productId}`,
          metadata: { productId, sku: product.sku },
        });
      }
    } else if (product.stockQuantity <= product.minStockLevel) {
      const recentNotif = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: "LOW_STOCK",
          metadata: { path: ["productId"], equals: productId },
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });
      if (!recentNotif) {
        await NotificationService.createNotification({
          tenantId,
          type: "LOW_STOCK",
          title: "Estoque baixo",
          message: `O produto "${product.name}" está com apenas ${product.stockQuantity} unidade(s) em estoque (mínimo: ${product.minStockLevel}).`,
          link: `/products/${productId}`,
          metadata: { productId, sku: product.sku, quantity: product.stockQuantity },
        });
      }
    }
  }

  static async getCategories(tenantId: string) {
    return prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  static async createCategory(
    data: { name: string; color?: string },
    tenantId: string
  ) {
    return prisma.category.create({
      data: { tenantId, name: data.name, color: data.color ?? "#6366f1" },
    });
  }
}
