import { PlanName } from "@prisma/client";

export interface PlanLimits {
  maxProducts: number;
  maxUsers: number;
  maxSalesPerMonth: number;
  maxIntegrations: number;
  features: string[];
  priceMonthly: number;
}

export const PLAN_DETAILS: Record<PlanName, PlanLimits> = {
  FREE: {
    maxProducts: 10,
    maxUsers: 1,
    maxSalesPerMonth: 50,
    maxIntegrations: 0,
    features: ["Dashboard básico", "Controle de estoque manual"],
    priceMonthly: 0,
  },
  STARTER: {
    maxProducts: 100,
    maxUsers: 3,
    maxSalesPerMonth: 500,
    maxIntegrations: 1,
    features: ["Gestão de produtos", "Relatórios mensais", "1 Integração Shopee"],
    priceMonthly: 49.9,
  },
  PRO: {
    maxProducts: 1000,
    maxUsers: 10,
    maxSalesPerMonth: 5000,
    maxIntegrations: 5,
    features: ["Multi-canais", "Relatórios avançados", "API Access", "Suporte prioritário"],
    priceMonthly: 129.9,
  },
  ENTERPRISE: {
    maxProducts: 999999, // Ilimitado na prática
    maxUsers: 99,
    maxSalesPerMonth: 999999,
    maxIntegrations: 99,
    features: ["Tudo do PRO", "Customizações", "SLA Garantido"],
    priceMonthly: 499.9, // Valor base ou Sob consulta
  },
};
