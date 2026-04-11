import prisma from "@/lib/db";
import type {
  ProfitRanking,
  ProfitRankingItem,
  StaleProductsReport,
} from "@/types/insights";

export const INSIGHTS_THRESHOLDS = {
  RANKING_PERIOD_DAYS: 30,
  STALE_DAYS_NO_SALES: 60,
  STALE_MONTHS_COVERAGE: 6,
  STALE_MIN_PRODUCT_AGE_DAYS: 30,
  STALE_VELOCITY_WINDOW_DAYS: 90,
  CARD_TOP_LIMIT: 5,
  CARD_STALE_LIMIT: 8,
} as const;

export class InsightsService {
  static async getProfitRanking(tenantId: string): Promise<ProfitRanking> {
    const since = new Date(
      Date.now() - INSIGHTS_THRESHOLDS.RANKING_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    const grouped = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          tenantId,
          saleDate: { gte: since },
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
      },
      _sum: { profit: true, totalPrice: true, quantity: true },
    });

    const hasIntegrationActive =
      (await prisma.integrationConfig.count({
        where: { tenantId, isActive: true, isMockMode: false },
      })) > 0;

    if (grouped.length === 0) {
      return {
        top: [],
        bottom: [],
        periodDays: INSIGHTS_THRESHOLDS.RANKING_PERIOD_DAYS,
        hasData: false,
        hasIntegrationActive,
      };
    }

    // Decimal → number
    const normalized = grouped.map((g) => ({
      productId: g.productId,
      totalProfit: Number(g._sum.profit ?? 0),
      totalRevenue: Number(g._sum.totalPrice ?? 0),
      unitsSold: Number(g._sum.quantity ?? 0),
    }));

    // Ordenar por profit
    const byProfitDesc = [...normalized].sort((a, b) => b.totalProfit - a.totalProfit);
    const byProfitAsc = [...normalized].sort((a, b) => a.totalProfit - b.totalProfit);

    const topN = byProfitDesc.slice(0, INSIGHTS_THRESHOLDS.CARD_TOP_LIMIT);
    const bottomN = byProfitAsc.slice(0, INSIGHTS_THRESHOLDS.CARD_TOP_LIMIT);

    // Buscar metadata dos produtos relevantes (top + bottom)
    const productIds = Array.from(
      new Set([...topN.map((p) => p.productId), ...bottomN.map((p) => p.productId)])
    );
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
      },
      select: { id: true, name: true, sku: true, imageUrl: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    function buildItem(
      n: { productId: string; totalProfit: number; totalRevenue: number; unitsSold: number }
    ): ProfitRankingItem | null {
      const meta = productMap.get(n.productId);
      if (!meta) return null;
      return {
        productId: n.productId,
        name: meta.name,
        sku: meta.sku,
        imageUrl: meta.imageUrl,
        totalProfit: n.totalProfit,
        totalRevenue: n.totalRevenue,
        unitsSold: n.unitsSold,
        avgMargin: n.totalRevenue > 0 ? (n.totalProfit / n.totalRevenue) * 100 : 0,
      };
    }

    const top = topN.map(buildItem).filter((x): x is ProfitRankingItem => x !== null);
    const bottom = bottomN.map(buildItem).filter((x): x is ProfitRankingItem => x !== null);

    return {
      top,
      bottom,
      periodDays: INSIGHTS_THRESHOLDS.RANKING_PERIOD_DAYS,
      hasData: top.length > 0,
      hasIntegrationActive,
    };
  }

  static async getStaleProducts(_tenantId: string): Promise<StaleProductsReport> {
    throw new Error("not implemented");
  }
}
