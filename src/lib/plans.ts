import { prisma } from "@/lib/db";

// ─── DEFINIÇÃO DOS PLANOS ─────────────────────────────────────

export type PlanKey = "free" | "basic" | "pro" | "premium";

export interface PlanLimits {
  maxProducts: number | null;     // null = ilimitado
  maxSalesPerMonth: number | null;
  maxUsers: number;
  features: PlanFeatures;
}

export interface PlanFeatures {
  excelExport: boolean;
  advancedReports: boolean;
  smartAlerts: boolean;
  shopeeAutoIntegration: boolean;
  multiStore: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
}

export interface PlanDefinition extends PlanLimits {
  key: PlanKey;
  name: string;
  price: number | null;      // null = preço customizado
  priceLabel: string;
  description: string;
  highlighted: boolean;
  cta: string;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    priceLabel: "R$ 0",
    description: "Para começar a organizar seu negócio",
    highlighted: false,
    cta: "Começar grátis",
    maxProducts: 100,
    maxSalesPerMonth: 500,
    maxUsers: 1,
    features: {
      excelExport: false,
      advancedReports: false,
      smartAlerts: false,
      shopeeAutoIntegration: false,
      multiStore: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  basic: {
    key: "basic",
    name: "Basic",
    price: 2990,
    priceLabel: "R$ 29,90/mês",
    description: "Para quem está crescendo",
    highlighted: false,
    cta: "Assinar Basic",
    maxProducts: 500,
    maxSalesPerMonth: 2000,
    maxUsers: 2,
    features: {
      excelExport: true,
      advancedReports: false,
      smartAlerts: false,
      shopeeAutoIntegration: false,
      multiStore: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: 5990,
    priceLabel: "R$ 59,90/mês",
    description: "Para vendedores sérios da Shopee",
    highlighted: true,
    cta: "Assinar Pro",
    maxProducts: null,
    maxSalesPerMonth: null,
    maxUsers: 5,
    features: {
      excelExport: true,
      advancedReports: true,
      smartAlerts: true,
      shopeeAutoIntegration: true,
      multiStore: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  premium: {
    key: "premium",
    name: "Premium",
    price: null,
    priceLabel: "Consultar",
    description: "Para operações de alto volume",
    highlighted: false,
    cta: "Falar com a equipe",
    maxProducts: null,
    maxSalesPerMonth: null,
    maxUsers: 999,
    features: {
      excelExport: true,
      advancedReports: true,
      smartAlerts: true,
      shopeeAutoIntegration: true,
      multiStore: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

export function getPlanLimits(plan: string): PlanDefinition {
  return PLANS[plan as PlanKey] ?? PLANS.free;
}

// ─── VERIFICAÇÕES DE LIMITE ──────────────────────────────────

export async function checkProductLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  planKey: string;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const planKey = tenant?.plan ?? "free";
  const limits = getPlanLimits(planKey);

  if (limits.maxProducts === null) {
    return { allowed: true, current: 0, limit: null, planKey };
  }

  const current = await prisma.product.count({
    where: { tenantId, deletedAt: null },
  });

  return {
    allowed: current < limits.maxProducts,
    current,
    limit: limits.maxProducts,
    planKey,
  };
}

export async function checkSalesMonthlyLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  planKey: string;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const planKey = tenant?.plan ?? "free";
  const limits = getPlanLimits(planKey);

  if (limits.maxSalesPerMonth === null) {
    return { allowed: true, current: 0, limit: null, planKey };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const current = await prisma.sale.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  return {
    allowed: current < limits.maxSalesPerMonth,
    current,
    limit: limits.maxSalesPerMonth,
    planKey,
  };
}

export async function getTenantUsage(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const planKey = tenant?.plan ?? "free";
  const limits = getPlanLimits(planKey);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [productCount, salesCount] = await Promise.all([
    prisma.product.count({ where: { tenantId, deletedAt: null } }),
    prisma.sale.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
  ]);

  return {
    planKey,
    plan: limits,
    usage: {
      products: {
        current: productCount,
        limit: limits.maxProducts,
        percentage: limits.maxProducts
          ? Math.min(Math.round((productCount / limits.maxProducts) * 100), 100)
          : 0,
      },
      salesMonth: {
        current: salesCount,
        limit: limits.maxSalesPerMonth,
        percentage: limits.maxSalesPerMonth
          ? Math.min(Math.round((salesCount / limits.maxSalesPerMonth) * 100), 100)
          : 0,
      },
    },
  };
}
