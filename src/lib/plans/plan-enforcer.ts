import prisma from "@/lib/db";
import { PLAN_DETAILS } from "@/constants/plans";
import { PlanName } from "@prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { safePercentage } from "@/utils/math";

export class PlanLimitError extends AppError {
  constructor(
    message: string,
    code: ErrorCodes,
    public readonly details: { limit: number; current: number; feature: string; upgrade: boolean }
  ) {
    super(message, 402, code);
  }
}

/**
 * Feature flags por plano. Use chaves curtas e estáveis aqui — elas
 * são citadas no código (`planEnforcer.checkFeatureAccess(t, 'reports')`).
 *
 * Para adicionar uma feature: incluir o nome no tipo `FeatureFlag` e
 * declarar quais planos a possuem em `PLAN_FEATURES`.
 */
export type FeatureFlag =
  | "reports"
  | "advancedReports"
  | "exportCsv"
  | "exportExcel"
  | "shopeeIntegration"
  | "multiMarketplace"
  | "smartAlerts"
  | "apiAccess"
  | "whatsappNotifications";

const PLAN_FEATURES: Record<PlanName, ReadonlySet<FeatureFlag>> = {
  FREE: new Set<FeatureFlag>([
    "reports",
  ]),
  STARTER: new Set<FeatureFlag>([
    "reports",
    "exportCsv",
    "shopeeIntegration",
  ]),
  PRO: new Set<FeatureFlag>([
    "reports",
    "advancedReports",
    "exportCsv",
    "exportExcel",
    "shopeeIntegration",
    "smartAlerts",
    "apiAccess",
    "whatsappNotifications",
  ]),
  ENTERPRISE: new Set<FeatureFlag>([
    "reports",
    "advancedReports",
    "exportCsv",
    "exportExcel",
    "shopeeIntegration",
    "multiMarketplace",
    "smartAlerts",
    "apiAccess",
    "whatsappNotifications",
  ]),
};

class PlanEnforcer {
  private async getSubscription(tenantId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { tenantId },
    });
    
    // Fallback para FREE se não houver registro (tenant novo)
    return {
      plan: (sub?.plan as PlanName) || "FREE",
      status: sub?.status || "ACTIVE",
    };
  }

  private async logLimitHit(tenantId: string, limitType: string, currentValue: number, limitValue: number, action: string) {
    await prisma.planLimitHit.create({
      data: { tenantId, limitType, currentValue, limitValue, action }
    }).catch(e => console.error("Error logging limit hit:", e));
  }

  async checkProductLimit(tenantId: string): Promise<void> {
    const { plan } = await this.getSubscription(tenantId);
    const limits = PLAN_DETAILS[plan];
    
    const current = await prisma.product.count({
      where: { tenantId, deletedAt: null },
    });

    if (current >= limits.maxProducts) {
      await this.logLimitHit(tenantId, 'products', current, limits.maxProducts, 'create_product');
      throw new PlanLimitError(
        `Limite de produtos (${limits.maxProducts}) atingido no plano ${plan}.`,
        ErrorCodes.PLAN_LIMIT_PRODUCTS,
        { limit: limits.maxProducts, current, feature: "products", upgrade: true }
      );
    }
  }

  async checkUserLimit(tenantId: string): Promise<void> {
    const { plan } = await this.getSubscription(tenantId);
    const limits = PLAN_DETAILS[plan];
    
    const current = await prisma.user.count({ where: { tenantId } });

    if (current >= limits.maxUsers) {
      await this.logLimitHit(tenantId, 'users', current, limits.maxUsers, 'add_user');
      throw new PlanLimitError(
        `Limite de usuários (${limits.maxUsers}) atingido no plano ${plan}.`,
        ErrorCodes.PLAN_LIMIT_USERS,
        { limit: limits.maxUsers, current, feature: "users", upgrade: true }
      );
    }
  }

  async checkSalesMonthLimit(tenantId: string): Promise<void> {
    const { plan } = await this.getSubscription(tenantId);
    const limits = PLAN_DETAILS[plan];
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const current = await prisma.sale.count({
      where: { tenantId, saleDate: { gte: startOfMonth } }
    });

    if (current >= limits.maxSalesPerMonth) {
      await this.logLimitHit(tenantId, 'sales_month', current, limits.maxSalesPerMonth, 'create_sale');
      throw new PlanLimitError(
        `Limite de vendas mensais (${limits.maxSalesPerMonth}) atingido no plano ${plan}.`,
        ErrorCodes.PLAN_LIMIT_SALES,
        { limit: limits.maxSalesPerMonth, current, feature: "sales", upgrade: true }
      );
    }
  }

  async checkIntegrationLimit(tenantId: string): Promise<void> {
    const { plan } = await this.getSubscription(tenantId);
    const limits = PLAN_DETAILS[plan];
    
    const current = await prisma.integrationConfig.count({
      where: { tenantId, isActive: true }
    });

    if (current >= limits.maxIntegrations) {
      throw new PlanLimitError(
        `Limite de integrações (${limits.maxIntegrations}) atingido no plano ${plan}.`,
        ErrorCodes.PLAN_LIMIT_INTEGRATIONS,
        { limit: limits.maxIntegrations, current, feature: "integrations", upgrade: true }
      );
    }
  }

  /**
   * Verifica se o plano do tenant inclui uma feature específica.
   * Lança `PlanLimitError` (HTTP 402) se a feature não estiver liberada.
   */
  async checkFeatureAccess(tenantId: string, feature: FeatureFlag): Promise<void> {
    const { plan } = await this.getSubscription(tenantId);
    const allowed = PLAN_FEATURES[plan]?.has(feature) ?? false;

    if (!allowed) {
      throw new PlanLimitError(
        `Feature "${feature}" não disponível no plano ${plan}.`,
        ErrorCodes.PLAN_FEATURE_UNAVAILABLE,
        { limit: 0, current: 0, feature, upgrade: true }
      );
    }
  }

  /**
   * Versão "soft" do checkFeatureAccess: retorna boolean em vez de lançar.
   * Útil para esconder elementos da UI.
   */
  async hasFeature(tenantId: string, feature: FeatureFlag): Promise<boolean> {
    const { plan } = await this.getSubscription(tenantId);
    return PLAN_FEATURES[plan]?.has(feature) ?? false;
  }

  /**
   * Alias semântico para `getUsageStats`. Mantido para compatibilidade
   * com `SubscriptionService.getSubscriptionWithUsage`.
   */
  async getUsage(tenantId: string) {
    return this.getUsageStats(tenantId);
  }

  async getUsageStats(tenantId: string) {
    const { plan } = await this.getSubscription(tenantId);
    const limits = PLAN_DETAILS[plan];

    const [currentProducts, currentUsers, currentSalesThisMonth, currentIntegrations] = await Promise.all([
      prisma.product.count({ where: { tenantId, deletedAt: null } }),
      prisma.user.count({ where: { tenantId } }),
      prisma.sale.count({
        where: { 
          tenantId, 
          saleDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } 
        }
      }),
      prisma.integrationConfig.count({ where: { tenantId, isActive: true } })
    ]);

    return {
      plan,
      products: {
        current: currentProducts,
        limit: limits.maxProducts,
        percentage: safePercentage(currentProducts, limits.maxProducts, 0),
      },
      users: {
        current: currentUsers,
        limit: limits.maxUsers,
        percentage: safePercentage(currentUsers, limits.maxUsers, 0),
      },
      salesThisMonth: {
        current: currentSalesThisMonth,
        limit: limits.maxSalesPerMonth,
        percentage: safePercentage(currentSalesThisMonth, limits.maxSalesPerMonth, 0),
      },
      integrations: {
        current: currentIntegrations,
        limit: limits.maxIntegrations,
        percentage: safePercentage(currentIntegrations, limits.maxIntegrations, 0),
      },
      features: limits.features,
    };
  }
}

export const planEnforcer = new PlanEnforcer();
