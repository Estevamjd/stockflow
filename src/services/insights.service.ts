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

  static async getStaleProducts(tenantId: string): Promise<StaleProductsReport> {
    const minAge = new Date(
      Date.now() - INSIGHTS_THRESHOLDS.STALE_MIN_PRODUCT_AGE_DAYS * 24 * 60 * 60 * 1000
    );

    // Query 1: produtos elegíveis
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: "ACTIVE",
        createdAt: { lt: minAge },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        costPrice: true,
        createdAt: true,
      },
    });

    const hasIntegrationActive =
      (await prisma.integrationConfig.count({
        where: { tenantId, isActive: true, isMockMode: false },
      })) > 0;

    if (products.length === 0) {
      return {
        items: [],
        totalCount: 0,
        totalStockValue: 0,
        hasIntegrationActive,
        hasData: false,
      };
    }

    const productIds = products.map((p) => p.id);

    // Query 2: última venda por produto
    const lastSales = await prisma.stockExit.groupBy({
      by: ["productId"],
      where: {
        tenantId,
        reason: "SALE",
        productId: { in: productIds },
      },
      _max: { exitDate: true },
    });

    // Query 3: velocidade dos últimos 90 dias
    const ninetyDaysAgo = new Date(
      Date.now() - INSIGHTS_THRESHOLDS.STALE_VELOCITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const velocity90d = await prisma.stockExit.groupBy({
      by: ["productId"],
      where: {
        tenantId,
        reason: "SALE",
        productId: { in: productIds },
        exitDate: { gte: ninetyDaysAgo },
      },
      _sum: { quantity: true },
    });

    // Indexar para lookup rápido
    const lastSaleMap = new Map<string, Date | null>();
    for (const row of lastSales) {
      lastSaleMap.set(row.productId, row._max.exitDate ?? null);
    }
    const velocityMap = new Map<string, number>();
    for (const row of velocity90d) {
      velocityMap.set(row.productId, Number(row._sum.quantity ?? 0));
    }

    const now = Date.now();
    const stale = [] as Array<
      StaleProductsReport["items"][number] & { _sortKey: number }
    >;

    for (const p of products) {
      const lastSale = lastSaleMap.get(p.id) ?? null;
      const v90 = velocityMap.get(p.id) ?? 0;
      const velocityPerDay = v90 / INSIGHTS_THRESHOLDS.STALE_VELOCITY_WINDOW_DAYS;

      let daysSinceLastSale: number | null = null;
      if (lastSale) {
        daysSinceLastSale = Math.floor(
          (now - lastSale.getTime()) / (24 * 60 * 60 * 1000)
        );
      }

      let monthsOfCoverage: number | null = null;
      if (velocityPerDay > 0) {
        monthsOfCoverage = p.stockQuantity / (velocityPerDay * 30);
      }

      let reason: "NEVER_SOLD" | "NO_SALES_60D" | "HIGH_COVERAGE" | null = null;
      let sortKey = 0;

      if (lastSale === null) {
        // Nunca vendeu — só marca como parado se tem estoque
        if (p.stockQuantity > 0) {
          reason = "NEVER_SOLD";
          sortKey = 1_000_000;
        }
      } else if (
        daysSinceLastSale !== null &&
        daysSinceLastSale > INSIGHTS_THRESHOLDS.STALE_DAYS_NO_SALES
      ) {
        reason = "NO_SALES_60D";
        sortKey = 500_000 + daysSinceLastSale;
      } else if (
        monthsOfCoverage !== null &&
        monthsOfCoverage > INSIGHTS_THRESHOLDS.STALE_MONTHS_COVERAGE
      ) {
        reason = "HIGH_COVERAGE";
        sortKey = monthsOfCoverage;
      }

      if (reason) {
        stale.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          stockQuantity: p.stockQuantity,
          stockValue: p.stockQuantity * Number(p.costPrice),
          daysSinceLastSale,
          monthsOfCoverage,
          reason,
          _sortKey: sortKey,
        });
      }
    }

    stale.sort((a, b) => b._sortKey - a._sortKey);

    const totalStockValue = stale.reduce((sum, p) => sum + p.stockValue, 0);
    const items = stale
      .slice(0, INSIGHTS_THRESHOLDS.CARD_STALE_LIMIT)
      .map(({ _sortKey: _, ...rest }) => rest);

    return {
      items,
      totalCount: stale.length,
      totalStockValue,
      hasIntegrationActive,
      hasData: stale.length > 0,
    };
  }
}
