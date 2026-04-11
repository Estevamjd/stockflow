import prisma from "@/lib/db";
import { safePercentage } from "@/utils/math";
import { AppError, ErrorCodes } from "@/lib/errors";

export interface SaasMetrics {
  tenants: {
    total: number;
    active: number;
    trialing: number;
    canceled: number;
    newLast30Days: number;
    churnRate: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    mrrByPlan: Record<string, number>;
  };
  usage: {
    totalProducts: number;
    totalSalesThisMonth: number;
    avgProductsPerTenant: number;
  };
}

export class AdminService {
  static async getSaasMetrics(): Promise<SaasMetrics> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalTenants,
        newLast30Days,
        subscriptions,
        totalProducts,
        totalSalesThisMonth
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.subscription.findMany(),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.sale.count({ where: { saleDate: { gte: startOfMonth } } }),
      ]);

      const active = subscriptions.filter(s => s.status === 'ACTIVE').length;
      const trialing = subscriptions.filter(s => s.status === 'TRIALING').length;
      const canceled = subscriptions.filter(s => s.status === 'CANCELED').length;

      // MRR
      const mrr = subscriptions
        .filter(s => s.status === 'ACTIVE')
        .reduce((sum, s) => sum + Number(s.priceMonthly), 0);
      
      const mrrByPlan = subscriptions.reduce((acc, sub) => {
        if (sub.status === 'ACTIVE') {
          const p = sub.plan.toString();
          acc[p] = (acc[p] || 0) + Number(sub.priceMonthly);
        }
        return acc;
      }, {} as Record<string, number>);

      // Churn (simplificado para 30 dias)
      const cancelsLast30Days = await prisma.billingEvent.count({
        where: { type: 'SUBSCRIPTION_CANCELED', createdAt: { gte: thirtyDaysAgo } }
      });
      const churnRate = safePercentage(cancelsLast30Days, active + cancelsLast30Days, 0);

      return {
        tenants: {
          total: totalTenants,
          active,
          trialing,
          canceled,
          newLast30Days,
          churnRate,
        },
        revenue: {
          mrr,
          arr: mrr * 12,
          mrrByPlan,
        },
        usage: {
          totalProducts,
          totalSalesThisMonth,
          avgProductsPerTenant: totalTenants > 0 ? totalProducts / totalTenants : 0,
        },
      };
    } catch (error) {
      console.error("❌ MRR Calc Error:", error);
      throw new AppError("Erro ao processar métricas SaaS.", 500, ErrorCodes.INTERNAL_ERROR);
    }
  }

  static async getTenantsList(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { slug: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: true,
          _count: { select: { users: true, products: { where: { deletedAt: null } }, sales: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    return { tenants, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Bloqueia ou desbloqueia um tenant (flip de `isActive`).
   * Registra a ação no ActivityLog.
   */
  static async blockTenant(
    tenantId: string,
    blocked: boolean,
    adminUserId: string
  ): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true },
    });
    if (!tenant) {
      throw new AppError("Tenant não encontrado", 404, ErrorCodes.NOT_FOUND);
    }

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: !blocked },
      }),
      prisma.activityLog.create({
        data: {
          tenantId,
          userId: adminUserId === "system" ? null : adminUserId,
          action: blocked ? "BLOCK_TENANT" : "UNBLOCK_TENANT",
          entity: "Tenant",
          entityId: tenantId,
          details: { previousIsActive: tenant.isActive, blocked },
        },
      }),
    ]);
  }

  static async getTenantDetail(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        billingEvents: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { products: { where: { deletedAt: null } }, sales: true } }
      }
    });

    if (!tenant) throw new AppError("Tenant não encontrado", 404, ErrorCodes.NOT_FOUND);
    return tenant;
  }
}
