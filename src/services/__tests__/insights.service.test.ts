import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do prisma client. Cada teste reseta com mockReset.
vi.mock("@/lib/db", () => ({
  default: {
    saleItem: {
      groupBy: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    stockExit: {
      groupBy: vi.fn(),
    },
    integrationConfig: {
      count: vi.fn(),
    },
  },
}));

// Re-import depois do mock para pegar o mock.
import prisma from "@/lib/db";
import { InsightsService } from "../insights.service";

const mockedPrisma = prisma as unknown as {
  saleItem: { groupBy: ReturnType<typeof vi.fn> };
  product: { findMany: ReturnType<typeof vi.fn> };
  stockExit: { groupBy: ReturnType<typeof vi.fn> };
  integrationConfig: { count: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  mockedPrisma.saleItem.groupBy.mockReset();
  mockedPrisma.product.findMany.mockReset();
  mockedPrisma.stockExit.groupBy.mockReset();
  mockedPrisma.integrationConfig.count.mockReset();
});

// Helper: cria item agregado do groupBy de SaleItem.
function aggItem(productId: string, profit: number, revenue: number, qty: number) {
  return {
    productId,
    _sum: { profit, totalPrice: revenue, quantity: qty },
  };
}

// Helper: cria metadata de produto retornado pelo findMany.
function productMeta(id: string, name: string, sku: string) {
  return { id, name, sku, imageUrl: null };
}

describe("InsightsService.getProfitRanking", () => {
  it("retorna top 5 e bottom 5 ordenados corretamente com 6 produtos", async () => {
    mockedPrisma.saleItem.groupBy.mockResolvedValue([
      aggItem("p1", 1000, 3000, 30),
      aggItem("p2", 800, 2000, 20),
      aggItem("p3", 600, 1500, 15),
      aggItem("p4", 400, 1000, 10),
      aggItem("p5", 200, 500, 5),
      aggItem("p6", 50, 200, 2),
    ]);
    mockedPrisma.product.findMany.mockResolvedValue([
      productMeta("p1", "Produto 1", "SKU1"),
      productMeta("p2", "Produto 2", "SKU2"),
      productMeta("p3", "Produto 3", "SKU3"),
      productMeta("p4", "Produto 4", "SKU4"),
      productMeta("p5", "Produto 5", "SKU5"),
      productMeta("p6", "Produto 6", "SKU6"),
    ]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getProfitRanking("tenant-1");

    expect(result.hasData).toBe(true);
    expect(result.periodDays).toBe(30);
    expect(result.top).toHaveLength(5);
    expect(result.bottom).toHaveLength(5);
    expect(result.top[0].productId).toBe("p1");
    expect(result.top[0].totalProfit).toBe(1000);
    expect(result.top[0].avgMargin).toBeCloseTo((1000 / 3000) * 100, 1);
    expect(result.bottom[0].productId).toBe("p6");
  });

  it("filtra vendas CANCELLED/REFUNDED via where da query", async () => {
    mockedPrisma.saleItem.groupBy.mockResolvedValue([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    await InsightsService.getProfitRanking("tenant-1");

    const callArg = mockedPrisma.saleItem.groupBy.mock.calls[0]![0] as {
      where: { sale: { status: { notIn: string[] } } };
    };
    expect(callArg.where.sale.status.notIn).toEqual(["CANCELLED", "REFUNDED"]);
  });

  it("retorna hasData=false com 0 vendas", async () => {
    mockedPrisma.saleItem.groupBy.mockResolvedValue([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getProfitRanking("tenant-1");

    expect(result.hasData).toBe(false);
    expect(result.top).toEqual([]);
    expect(result.bottom).toEqual([]);
  });

  it("com 3 produtos, top e bottom retornam todos os 3", async () => {
    mockedPrisma.saleItem.groupBy.mockResolvedValue([
      aggItem("a", 100, 300, 10),
      aggItem("b", 200, 500, 20),
      aggItem("c", 50, 200, 5),
    ]);
    mockedPrisma.product.findMany.mockResolvedValue([
      productMeta("a", "A", "SKU-A"),
      productMeta("b", "B", "SKU-B"),
      productMeta("c", "C", "SKU-C"),
    ]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getProfitRanking("tenant-1");

    expect(result.top).toHaveLength(3);
    expect(result.bottom).toHaveLength(3);
    expect(result.top[0].productId).toBe("b");
    expect(result.bottom[0].productId).toBe("c");
  });

  it("retorna hasIntegrationActive=true quando há integração não-mock ativa", async () => {
    mockedPrisma.saleItem.groupBy.mockResolvedValue([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(1);

    const result = await InsightsService.getProfitRanking("tenant-1");

    expect(result.hasIntegrationActive).toBe(true);
  });
});

describe("InsightsService.getStaleProducts", () => {
  // Helper para criar produto elegível
  function makeProduct(
    id: string,
    name: string,
    sku: string,
    stockQuantity: number,
    costPrice: number,
    daysOld = 60
  ) {
    return {
      id,
      name,
      sku,
      stockQuantity,
      costPrice,
      createdAt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000),
    };
  }

  it("classifica produto que nunca vendeu como NEVER_SOLD", async () => {
    mockedPrisma.product.findMany.mockResolvedValue([
      makeProduct("p1", "Nunca vendido", "SKU1", 10, 50),
    ]);
    mockedPrisma.stockExit.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.hasData).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].reason).toBe("NEVER_SOLD");
    expect(result.items[0].daysSinceLastSale).toBeNull();
    expect(result.items[0].stockValue).toBe(10 * 50);
  });

  it("classifica produto sem vendas há 70 dias como NO_SALES_60D", async () => {
    const seventyDaysAgo = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
    mockedPrisma.product.findMany.mockResolvedValue([
      makeProduct("p1", "Velho", "SKU1", 5, 30),
    ]);
    mockedPrisma.stockExit.groupBy
      .mockResolvedValueOnce([{ productId: "p1", _max: { exitDate: seventyDaysAgo } }])
      .mockResolvedValueOnce([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.items[0].reason).toBe("NO_SALES_60D");
    expect(result.items[0].daysSinceLastSale).toBeGreaterThanOrEqual(70);
  });

  it("classifica produto com cobertura > 6 meses como HIGH_COVERAGE", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mockedPrisma.product.findMany.mockResolvedValue([
      makeProduct("p1", "Devagar", "SKU1", 100, 10),
    ]);
    mockedPrisma.stockExit.groupBy
      .mockResolvedValueOnce([{ productId: "p1", _max: { exitDate: tenDaysAgo } }])
      .mockResolvedValueOnce([{ productId: "p1", _sum: { quantity: 3 } }]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.items[0].reason).toBe("HIGH_COVERAGE");
    expect(result.items[0].monthsOfCoverage).toBeGreaterThan(6);
  });

  it("ignora produtos com createdAt < 30 dias", async () => {
    mockedPrisma.product.findMany.mockResolvedValue([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.hasData).toBe(false);
    const callArg = mockedPrisma.product.findMany.mock.calls[0]![0] as {
      where: { createdAt: { lt: Date } };
    };
    expect(callArg.where.createdAt.lt).toBeInstanceOf(Date);
  });

  it("ordena por criticidade: NEVER_SOLD > NO_SALES_60D > HIGH_COVERAGE", async () => {
    const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    mockedPrisma.product.findMany.mockResolvedValue([
      makeProduct("never", "Nunca", "SKU-N", 5, 10),
      makeProduct("old", "Velho", "SKU-O", 3, 20),
      makeProduct("slow", "Devagar", "SKU-S", 100, 5),
    ]);
    mockedPrisma.stockExit.groupBy
      .mockResolvedValueOnce([
        { productId: "old", _max: { exitDate: eightyDaysAgo } },
        { productId: "slow", _max: { exitDate: fiveDaysAgo } },
      ])
      .mockResolvedValueOnce([
        { productId: "slow", _sum: { quantity: 2 } },
      ]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.items.map((i) => i.productId)).toEqual(["never", "old", "slow"]);
    expect(result.items.map((i) => i.reason)).toEqual([
      "NEVER_SOLD",
      "NO_SALES_60D",
      "HIGH_COVERAGE",
    ]);
  });

  it("retorna hasIntegrationActive=true quando há integração ativa", async () => {
    mockedPrisma.product.findMany.mockResolvedValue([]);
    mockedPrisma.integrationConfig.count.mockResolvedValue(1);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.hasIntegrationActive).toBe(true);
  });
});
