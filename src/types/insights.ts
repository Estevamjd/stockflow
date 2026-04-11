/**
 * Tipos públicos do InsightsService.
 *
 * Convenção: todos os Decimals do Prisma são convertidos para `number`
 * no service antes de cruzar a fronteira para o client. O cliente nunca
 * recebe instâncias de `Decimal`.
 */

export interface ProfitRankingItem {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  totalProfit: number;        // R$ acumulado no período
  totalRevenue: number;       // R$ acumulado no período
  unitsSold: number;
  avgMargin: number;          // % (totalProfit / totalRevenue * 100)
}

export interface ProfitRanking {
  top: ProfitRankingItem[];        // até 5, ordenado por totalProfit DESC
  bottom: ProfitRankingItem[];     // até 5, ordenado por totalProfit ASC
  periodDays: 30;
  hasData: boolean;                // false → empty state
  hasIntegrationActive: boolean;   // pra empty state inteligente
}

export type StaleReason = "NEVER_SOLD" | "NO_SALES_60D" | "HIGH_COVERAGE";

export interface StaleProduct {
  productId: string;
  name: string;
  sku: string;
  stockQuantity: number;
  stockValue: number;                  // costPrice * stockQuantity
  daysSinceLastSale: number | null;    // null = nunca vendeu
  monthsOfCoverage: number | null;     // null se velocidade = 0
  reason: StaleReason;
}

export interface StaleProductsReport {
  items: StaleProduct[];               // máx 8, ordenados por criticidade
  totalCount: number;                  // total real (pode ser > items.length)
  totalStockValue: number;             // soma de stockValue de TODOS os parados
  hasIntegrationActive: boolean;       // pra empty state inteligente
  hasData: boolean;
}
