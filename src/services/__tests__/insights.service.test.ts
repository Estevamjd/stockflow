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
