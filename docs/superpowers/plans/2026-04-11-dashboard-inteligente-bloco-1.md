# Dashboard Inteligente — Bloco 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar dois cards inteligentes ao dashboard do StockFlow — Ranking de Lucro e Produtos Parados — cobertos por testes unitários no service que os alimenta.

**Architecture:** Server component existente (`dashboard/page.tsx`) chama dois métodos estáticos novos de `InsightsService` em paralelo com os awaits que já tem; passa os resultados como props pro `DashboardClient`; este renderiza dois client components novos numa terceira linha do grid. Toda a lógica de negócio fica em `InsightsService`, testada via mock do Prisma client.

**Tech Stack:** Next.js 16 App Router + Prisma 5.22 + React 19 + Tailwind 4 + lucide-react. Testes com **Vitest** + `vi.mock` para o Prisma client (não introduzimos `@testing-library/react` neste bloco — UI testing entra depois). Build: `npm run ci` (lint + typecheck + build).

**Spec source:** `docs/superpowers/specs/2026-04-11-dashboard-inteligente-design.md`

---

## File Structure

| Arquivo | Status | Responsabilidade |
|---|---|---|
| `src/types/insights.ts` | **CREATE** | Tipos compartilhados (`ProfitRanking`, `StaleProduct`, etc) usados por service e componentes |
| `src/services/insights.service.ts` | **CREATE** | `InsightsService` com `getProfitRanking()` e `getStaleProducts()`, mais `INSIGHTS_THRESHOLDS` |
| `src/services/__tests__/insights.service.test.ts` | **CREATE** | 10 testes unitários cobrindo todos os edge cases listados no spec |
| `src/app/(dashboard)/dashboard/ProfitRankingCard.tsx` | **CREATE** | Client component, abas Top/Bottom, empty state inteligente |
| `src/app/(dashboard)/dashboard/StaleProductsCard.tsx` | **CREATE** | Client component, header de capital parado, empty state inteligente |
| `src/app/(dashboard)/dashboard/page.tsx` | **MODIFY** | Adicionar 2 awaits no `Promise.all` existente, passar como props |
| `src/app/(dashboard)/dashboard/DashboardClient.tsx` | **MODIFY** | Adicionar nova linha de grid renderizando os 2 cards |
| `vitest.config.ts` | **CREATE** | Configuração mínima do Vitest com path alias `@/` |
| `package.json` | **MODIFY** | Adicionar `vitest`/`@vitest/...` em devDeps + scripts `test`/`test:watch`; incluir `npm test` no `npm run ci` |

---

## Task 1: Setup Vitest

**Files:**
- Modify: `package.json` (add devDeps + scripts)
- Create: `vitest.config.ts`
- Create: `src/services/__tests__/sanity.test.ts` (descartado no fim do task — só pra validar setup)

- [ ] **Step 1: Instalar Vitest e dependências**

```bash
cd stockflow
npm install -D vitest@^2.1.8 @vitest/coverage-v8@^2.1.8
```

Expected: instalação limpa, sem erros. Pode aparecer warning de peer deps — ignorar.

- [ ] **Step 2: Adicionar scripts no `package.json`**

Atualizar a chave `scripts` (manter o que já existe e adicionar):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "ci": "npm run lint && npm run typecheck && npm run test && npm run build",
  "prisma:generate": "prisma generate",
  "prisma:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "db:seed-admin": "tsx prisma/seed-admin.ts",
  "db:reset-demo": "tsx prisma/reset-demo-password.ts"
}
```

A mudança importante é: adicionei `"test"` e `"test:watch"`, e incluí `npm run test` no `"ci"` entre `typecheck` e `build`.

- [ ] **Step 3: Criar `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Escrever um teste de sanidade**

Criar `src/services/__tests__/sanity.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("should pass", () => {
    expect(1 + 1).toBe(2);
  });

  it("should resolve @/ alias", async () => {
    // Validar que o alias funciona importando algo trivial.
    const { ErrorCodes } = await import("@/lib/errors");
    expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
  });
});
```

- [ ] **Step 5: Rodar o teste de sanidade**

```bash
npm test
```

Expected:
```
✓ src/services/__tests__/sanity.test.ts (2)
  ✓ vitest setup (2)
    ✓ should pass
    ✓ should resolve @/ alias

Test Files  1 passed (1)
Tests       2 passed (2)
```

Se falhar com "Cannot find module @/lib/errors", revisar o alias no `vitest.config.ts`. Se falhar com erro do TypeScript, adicionar `"vitest/globals"` em `tsconfig.json` `types`. Se passar, segue.

- [ ] **Step 6: Validar `npm run ci` ainda passa**

```bash
npm run ci
```

Expected: lint + typecheck + test + build, todos exit 0. Se o ESLint reclamar do `vitest.config.ts` ou do arquivo de teste, adicionar `**/__tests__/**` ao `eslintignore` ou um override no `eslint.config.mjs`. Se reclamar de globals, adicionar `vitest/globals` no `tsconfig.json`.

- [ ] **Step 7: Apagar o teste de sanidade**

```bash
rm src/services/__tests__/sanity.test.ts
```

(Já validamos a infra — não precisamos do teste no repo final. Se preferir manter, fica a critério.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): setup Vitest with @/ alias and CI integration

- Add vitest + @vitest/coverage-v8 as devDependencies
- Add npm test, test:watch scripts
- Wire test into npm run ci between typecheck and build
- vitest.config.ts with path alias matching tsconfig"
```

---

## Task 2: Tipos compartilhados (`src/types/insights.ts`)

**Files:**
- Create: `src/types/insights.ts`

Sem testes — é apenas declaração de tipos. Validação via `npm run typecheck`.

- [ ] **Step 1: Criar o arquivo de tipos**

```typescript
// src/types/insights.ts

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
```

- [ ] **Step 2: Validar typecheck**

```bash
npm run typecheck
```

Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/types/insights.ts
git commit -m "feat(insights): shared types for dashboard inteligente

Tipos consumidos por InsightsService e componentes ProfitRankingCard /
StaleProductsCard. Spec: docs/superpowers/specs/2026-04-11-dashboard-inteligente-design.md"
```

---

## Task 3: `InsightsService.getProfitRanking` via TDD

**Files:**
- Create: `src/services/insights.service.ts` (esqueleto)
- Create: `src/services/__tests__/insights.service.test.ts`
- Create: `src/services/__tests__/__mocks__/db.ts` (mock helpers)

- [ ] **Step 1: Criar o esqueleto do InsightsService**

```typescript
// src/services/insights.service.ts
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
  static async getProfitRanking(_tenantId: string): Promise<ProfitRanking> {
    throw new Error("not implemented");
  }

  static async getStaleProducts(_tenantId: string): Promise<StaleProductsReport> {
    throw new Error("not implemented");
  }
}
```

- [ ] **Step 2: Criar helpers de mock no arquivo de teste**

Criar `src/services/__tests__/insights.service.test.ts`:

```typescript
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
```

- [ ] **Step 3: Escrever o primeiro teste falhando — happy path com 6 produtos**

Adicionar ao mesmo arquivo, depois do `beforeEach`:

```typescript
describe("InsightsService.getProfitRanking", () => {
  it("retorna top 5 e bottom 5 ordenados corretamente com 6 produtos", async () => {
    mockedPrisma.saleItem.groupBy.mockResolvedValue([
      aggItem("p1", 1000, 3000, 30),  // top 1
      aggItem("p2", 800, 2000, 20),
      aggItem("p3", 600, 1500, 15),
      aggItem("p4", 400, 1000, 10),
      aggItem("p5", 200, 500, 5),
      aggItem("p6", 50, 200, 2),      // bottom 1
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
});
```

- [ ] **Step 4: Rodar o teste para confirmar que falha**

```bash
npm test -- insights.service
```

Expected: FAIL com "not implemented".

- [ ] **Step 5: Implementar `getProfitRanking` minimamente**

Substituir o método no `insights.service.ts`:

```typescript
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
    if (!meta) return null; // produto deletado, ignorar
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
```

- [ ] **Step 6: Rodar o teste para confirmar que passa**

```bash
npm test -- insights.service
```

Expected: 1 passed.

- [ ] **Step 7: Escrever os testes restantes do `getProfitRanking`**

Adicionar dentro do mesmo `describe("InsightsService.getProfitRanking", ...)`:

```typescript
it("filtra vendas CANCELLED/REFUNDED via where da query", async () => {
  // Validamos que o where da chamada inclui status notIn.
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
  expect(result.top[0].productId).toBe("b"); // maior lucro
  expect(result.bottom[0].productId).toBe("c"); // menor lucro
});

it("retorna hasIntegrationActive=true quando há integração não-mock ativa", async () => {
  mockedPrisma.saleItem.groupBy.mockResolvedValue([]);
  mockedPrisma.integrationConfig.count.mockResolvedValue(1);

  const result = await InsightsService.getProfitRanking("tenant-1");

  expect(result.hasIntegrationActive).toBe(true);
});
```

- [ ] **Step 8: Rodar todos os testes do `getProfitRanking`**

```bash
npm test -- insights.service
```

Expected: 5 passed (1 happy path + 4 edge cases). Se algum falhar, ler a mensagem e ajustar a implementação. Não passar pra próxima etapa enquanto não estiver tudo verde.

- [ ] **Step 9: Commit**

```bash
git add src/services/insights.service.ts src/services/__tests__/insights.service.test.ts
git commit -m "feat(insights): InsightsService.getProfitRanking with TDD coverage

- Aggregates SaleItem.profit by productId for last 30 days
- Filters CANCELLED/REFUNDED sales via where clause
- Returns top 5 + bottom 5 with both R\$ and avgMargin
- Empty state with hasIntegrationActive flag for smart CTA
- 5 unit tests via vi.mock(@/lib/db)"
```

---

## Task 4: `InsightsService.getStaleProducts` via TDD

**Files:**
- Modify: `src/services/insights.service.ts` (implementar segundo método)
- Modify: `src/services/__tests__/insights.service.test.ts` (adicionar 5 testes)

- [ ] **Step 1: Escrever o primeiro teste do getStaleProducts**

Adicionar ao arquivo de testes (depois do `describe` do ranking):

```typescript
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
    // groupBy de lastSale → vazio (nunca apareceu em StockExit)
    mockedPrisma.stockExit.groupBy
      .mockResolvedValueOnce([]) // _max(exitDate)
      .mockResolvedValueOnce([]); // _sum(quantity) 90d
    mockedPrisma.integrationConfig.count.mockResolvedValue(0);

    const result = await InsightsService.getStaleProducts("tenant-1");

    expect(result.hasData).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].reason).toBe("NEVER_SOLD");
    expect(result.items[0].daysSinceLastSale).toBeNull();
    expect(result.items[0].stockValue).toBe(10 * 50);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test -- insights.service
```

Expected: 5 passed (do task anterior) + 1 failing ("not implemented").

- [ ] **Step 3: Implementar `getStaleProducts` minimamente**

Substituir o método no `insights.service.ts`:

```typescript
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
      // Nunca vendeu — só marca como parado se tem estoque (senão é só catálogo)
      if (p.stockQuantity > 0) {
        reason = "NEVER_SOLD";
        sortKey = 1_000_000; // top de prioridade
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
      sortKey = monthsOfCoverage; // ordena por cobertura desc
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
```

- [ ] **Step 4: Rodar o teste do NEVER_SOLD**

```bash
npm test -- insights.service
```

Expected: 6 passed.

- [ ] **Step 5: Adicionar os testes restantes do `getStaleProducts`**

Adicionar dentro do mesmo `describe`:

```typescript
it("classifica produto sem vendas há 70 dias como NO_SALES_60D", async () => {
  const seventyDaysAgo = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
  mockedPrisma.product.findMany.mockResolvedValue([
    makeProduct("p1", "Velho", "SKU1", 5, 30),
  ]);
  mockedPrisma.stockExit.groupBy
    .mockResolvedValueOnce([{ productId: "p1", _max: { exitDate: seventyDaysAgo } }])
    .mockResolvedValueOnce([]); // velocidade 90d = 0
  mockedPrisma.integrationConfig.count.mockResolvedValue(0);

  const result = await InsightsService.getStaleProducts("tenant-1");

  expect(result.items[0].reason).toBe("NO_SALES_60D");
  expect(result.items[0].daysSinceLastSale).toBeGreaterThanOrEqual(70);
});

it("classifica produto com cobertura > 6 meses como HIGH_COVERAGE", async () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  mockedPrisma.product.findMany.mockResolvedValue([
    makeProduct("p1", "Devagar", "SKU1", 100, 10), // estoque alto
  ]);
  mockedPrisma.stockExit.groupBy
    .mockResolvedValueOnce([{ productId: "p1", _max: { exitDate: tenDaysAgo } }])
    .mockResolvedValueOnce([{ productId: "p1", _sum: { quantity: 3 } }]); // 3 unidades em 90 dias = 0.033/dia → 100 unidades = 100 meses
  mockedPrisma.integrationConfig.count.mockResolvedValue(0);

  const result = await InsightsService.getStaleProducts("tenant-1");

  expect(result.items[0].reason).toBe("HIGH_COVERAGE");
  expect(result.items[0].monthsOfCoverage).toBeGreaterThan(6);
});

it("ignora produtos com createdAt < 30 dias", async () => {
  // Mocka findMany retornando vazio porque o where filtra por createdAt
  mockedPrisma.product.findMany.mockResolvedValue([]);
  mockedPrisma.integrationConfig.count.mockResolvedValue(0);

  const result = await InsightsService.getStaleProducts("tenant-1");

  expect(result.hasData).toBe(false);
  // Validar que o where do findMany inclui o filtro de createdAt
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
      { productId: "slow", _sum: { quantity: 2 } }, // velocidade muito baixa
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
```

- [ ] **Step 6: Rodar todos os testes**

```bash
npm test -- insights.service
```

Expected: 10 passed (5 do ranking + 5 de stale).

- [ ] **Step 7: Validar `npm run ci` completo**

```bash
npm run ci
```

Expected: lint + typecheck + test + build, todos exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/services/insights.service.ts src/services/__tests__/insights.service.test.ts
git commit -m "feat(insights): InsightsService.getStaleProducts with TDD coverage

- Identifica produtos parados via 3 critérios: NEVER_SOLD, NO_SALES_60D, HIGH_COVERAGE
- Ignora produtos createdAt < 30 dias e produtos sem estoque
- 5 testes cobrindo todas as classificações + ordenação por criticidade
- 4 queries no total: products elegíveis, last sale, velocity 90d, integration active"
```

---

## Task 5: `ProfitRankingCard` (UI client component)

**Files:**
- Create: `src/app/(dashboard)/dashboard/ProfitRankingCard.tsx`

Sem testes unitários (UI testing entra em bloco posterior, conforme spec).

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ShoppingCart, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProfitRanking, ProfitRankingItem } from "@/types/insights";

interface Props {
  data: ProfitRanking;
}

type Tab = "top" | "bottom";

export function ProfitRankingCard({ data }: Props) {
  const [tab, setTab] = useState<Tab>("top");

  if (!data.hasData) {
    return <EmptyState hasIntegrationActive={data.hasIntegrationActive} />;
  }

  const items = tab === "top" ? data.top : data.bottom;
  const isUnique = data.top.length < 5;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Ranking de Lucro</h3>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </div>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setTab("top")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
              tab === "top"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top 5
          </button>
          <button
            type="button"
            onClick={() => setTab("bottom")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
              tab === "bottom"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Piores 5
          </button>
        </div>
      </div>

      {isUnique && (
        <p className="text-xs text-amber-600 dark:text-amber-400 italic">
          Apenas {data.top.length} produto(s) com vendas no período.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-border/50">
        {items.map((item, idx) => (
          <RankRow key={item.productId} item={item} index={idx} variant={tab} />
        ))}
      </ul>
    </div>
  );
}

function RankRow({
  item,
  index,
  variant,
}: {
  item: ProfitRankingItem;
  index: number;
  variant: Tab;
}) {
  const accent =
    variant === "top"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <li>
      <Link
        href={`/products/${item.productId}`}
        className="flex items-center gap-3 py-3 group hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
      >
        <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Vendidos: {item.unitsSold} · Margem: {item.avgMargin.toFixed(0)}%
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${accent} tabular-nums`}>
            {formatCurrency(item.totalProfit)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ hasIntegrationActive }: { hasIntegrationActive: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[240px]">
      <div className="p-3 rounded-full bg-muted">
        <TrendingDown className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">Nenhuma venda no período</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {hasIntegrationActive
            ? "Aguardando primeira venda sincronizada da loja conectada."
            : "Comece registrando uma venda manual ou conecte sua loja."}
        </p>
      </div>
      {!hasIntegrationActive && (
        <div className="flex gap-2 mt-1">
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            <ShoppingCart className="w-3 h-3" />
            Registrar venda
          </Link>
          <Link
            href="/integrations"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-bold hover:bg-muted"
          >
            Conectar loja
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Validar typecheck**

```bash
npm run typecheck
```

Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/ProfitRankingCard.tsx
git commit -m "feat(dashboard): ProfitRankingCard with Top/Bottom tabs and smart empty state"
```

---

## Task 6: `StaleProductsCard` (UI client component)

**Files:**
- Create: `src/app/(dashboard)/dashboard/StaleProductsCard.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import Link from "next/link";
import { Ban, Clock, Package, CheckCircle, AlertTriangle, ShoppingCart, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { StaleProduct, StaleProductsReport, StaleReason } from "@/types/insights";

interface Props {
  data: StaleProductsReport;
}

const REASON_META: Record<
  StaleReason,
  { icon: typeof Ban; label: string; tone: string }
> = {
  NEVER_SOLD: {
    icon: Ban,
    label: "Nunca vendido",
    tone: "text-rose-600 dark:text-rose-400",
  },
  NO_SALES_60D: {
    icon: Clock,
    label: "Sem venda recente",
    tone: "text-amber-600 dark:text-amber-400",
  },
  HIGH_COVERAGE: {
    icon: Package,
    label: "Cobertura alta",
    tone: "text-blue-600 dark:text-blue-400",
  },
};

export function StaleProductsCard({ data }: Props) {
  if (!data.hasData) {
    return <EmptyState hasIntegrationActive={data.hasIntegrationActive} />;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Produtos Parados</h3>
            <p className="text-xs text-muted-foreground">
              Capital parado:{" "}
              <span className="font-bold text-foreground">
                {formatCurrency(data.totalStockValue)}
              </span>{" "}
              em {data.totalCount} produto{data.totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border/50">
        {data.items.map((item) => (
          <StaleRow key={item.productId} item={item} />
        ))}
      </ul>

      {data.totalCount > data.items.length && (
        <Link
          href="/products"
          className="text-xs font-bold text-primary hover:underline underline-offset-4 self-start"
        >
          Ver todos ({data.totalCount}) →
        </Link>
      )}
    </div>
  );
}

function StaleRow({ item }: { item: StaleProduct }) {
  const meta = REASON_META[item.reason];
  const Icon = meta.icon;

  let detail = "";
  if (item.reason === "NEVER_SOLD") {
    detail = "Nunca vendido";
  } else if (item.reason === "NO_SALES_60D" && item.daysSinceLastSale !== null) {
    detail = `${item.daysSinceLastSale} dias sem venda`;
  } else if (item.reason === "HIGH_COVERAGE" && item.monthsOfCoverage !== null) {
    detail = `Cobertura: ${item.monthsOfCoverage.toFixed(1)} meses`;
  }

  return (
    <li>
      <Link
        href={`/products/${item.productId}`}
        className="flex items-start gap-3 py-3 group hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
      >
        <Icon className={`w-4 h-4 mt-0.5 ${meta.tone} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.stockQuantity} un · {formatCurrency(item.stockValue)} em estoque
            {detail && ` · ${detail}`}
          </p>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ hasIntegrationActive }: { hasIntegrationActive: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[240px]">
      <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">
          Nenhum produto parado
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {hasIntegrationActive
            ? "Seu estoque está girando bem 🎯"
            : "Cadastre produtos e registre vendas para ver os insights aqui."}
        </p>
      </div>
      {!hasIntegrationActive && (
        <div className="flex gap-2 mt-1">
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            <ShoppingCart className="w-3 h-3" />
            Registrar venda
          </Link>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-bold hover:bg-muted"
          >
            Cadastrar produto
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Validar typecheck**

```bash
npm run typecheck
```

Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/StaleProductsCard.tsx
git commit -m "feat(dashboard): StaleProductsCard with capital parado header and smart empty state"
```

---

## Task 7: Wire into `dashboard/page.tsx` and `DashboardClient.tsx`

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Atualizar `dashboard/page.tsx`**

Adicionar o import e os 2 awaits no `Promise.all` existente:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { DashboardClient } from "./DashboardClient";
import { SaleService } from "@/services/sale.service";
import { InventoryService } from "@/services/inventory.service";
import { NotificationService } from "@/services/notification.service";
import { InsightsService } from "@/services/insights.service";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as { tenantId: string }).tenantId;

  // Buscar todos os dados em paralelo
  const [
    salesStats,
    inventoryStats,
    productData,
    chartData,
    channelData,
    recentSales,
    lowStockProducts,
    recentNotifications,
    profitRanking,
    staleProducts,
  ] = await Promise.all([
    SaleService.getSalesStats(tenantId),
    InventoryService.getStats(tenantId),
    prisma.product.count({ where: { tenantId, deletedAt: null, status: "ACTIVE" } }),
    SaleService.getRevenueChartData(tenantId),
    SaleService.getChannelDistribution(tenantId),
    SaleService.getSales(tenantId, { limit: 10, page: 1 }),
    prisma.product.findMany({
      where: { tenantId, deletedAt: null, status: "ACTIVE", stockQuantity: { lte: 5, gt: 0 } },
      select: { id: true, name: true, sku: true, stockQuantity: true, minStockLevel: true },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    }),
    NotificationService.getNotifications(tenantId, { unreadOnly: true, limit: 5 }),
    InsightsService.getProfitRanking(tenantId),
    InsightsService.getStaleProducts(tenantId),
  ]);

  return (
    <DashboardClient
      salesStats={salesStats}
      inventoryStats={inventoryStats}
      totalProducts={productData}
      chartData={chartData}
      channelData={channelData}
      recentSales={recentSales.sales}
      lowStockProducts={lowStockProducts}
      recentNotifications={recentNotifications.notifications}
      profitRanking={profitRanking}
      staleProducts={staleProducts}
    />
  );
}
```

- [ ] **Step 2: Atualizar `DashboardClient.tsx` — imports e props**

Localizar os imports no topo do arquivo e adicionar (mantendo os existentes):

```tsx
import { ProfitRankingCard } from "./ProfitRankingCard";
import { StaleProductsCard } from "./StaleProductsCard";
import type { ProfitRanking, StaleProductsReport } from "@/types/insights";
```

Localizar a interface `Props` (ou os parâmetros do componente) e adicionar os dois novos campos. O componente atual desestrutura assim:

```tsx
export function DashboardClient({
  salesStats, inventoryStats, totalProducts, chartData, channelData,
  recentSales, lowStockProducts, recentNotifications,
  stockEntryCount = 0, totalSales = 0,
}: Props) {
```

Adicionar à interface `Props` (procurar a definição que está antes do componente) os campos `profitRanking: ProfitRanking;` e `staleProducts: StaleProductsReport;`. Adicionar à desestruturação:

```tsx
export function DashboardClient({
  salesStats, inventoryStats, totalProducts, chartData, channelData,
  recentSales, lowStockProducts, recentNotifications,
  stockEntryCount = 0, totalSales = 0,
  profitRanking, staleProducts,
}: Props) {
```

> Importante: localizar a interface `Props` exata no arquivo. Pode estar antes do componente ou inline. Adicionar os dois campos preservando os existentes.

- [ ] **Step 3: Renderizar a nova linha de grid no JSX**

Localizar o final do JSX retornado pelo componente — depois das notificações e estoque baixo. Adicionar antes do fechamento do container externo:

```tsx
      {/* Linha 3 — Insights inteligentes (Bloco 1 da Fase 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfitRankingCard data={profitRanking} />
        <StaleProductsCard data={staleProducts} />
      </div>
```

> Se a estrutura usar `<div className="space-y-4">` no nível raiz, basta inserir esse bloco como o último filho. Se usar `<>` (fragment) e múltiplos divs, inserir antes do fragment de fechar.

- [ ] **Step 4: Validar typecheck**

```bash
npm run typecheck
```

Expected: 0 erros.

Se reclamar de `Props` undefined, abrir `DashboardClient.tsx` e localizar a definição da interface. Adicionar lá:

```tsx
profitRanking: ProfitRanking;
staleProducts: StaleProductsReport;
```

- [ ] **Step 5: Validar `npm run ci` completo**

```bash
npm run ci
```

Expected: lint + typecheck + test (10 testes) + build, todos exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx src/app/\(dashboard\)/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): wire ProfitRanking and StaleProducts cards into dashboard

- page.tsx: 2 awaits adicionados ao Promise.all paralelo (8 → 10 awaits)
- DashboardClient: Props extended + nova linha grid 1×2 ao final do JSX"
```

---

## Task 8: Smoke test manual + commit final

**Files:** nenhum.

- [ ] **Step 1: Garantir que o Supabase está ativo**

Se o projeto pausou por inatividade desde o último uso:
```bash
# Via curl à Supabase REST ou via MCP `restore_project`
# Para esta sessão, basta abrir o login uma vez no browser que ele acorda.
```

Verificar status com SQL trivial via Supabase ou Prisma Studio.

- [ ] **Step 2: Subir o dev server**

```bash
cd stockflow
npm run dev
```

Expected: `✓ Ready in <ms> · Local: http://localhost:3000`. Se reclamar de schema desatualizado, rodar `npx prisma generate`.

- [ ] **Step 3: Login com a conta demo**

Abrir `http://localhost:3000/login`. Login: `demo@stockflow.com` / `demo123456`.

Expected: redireciona para `/dashboard`.

- [ ] **Step 4: Validar visualmente os 2 cards novos**

Rolar até o final do dashboard. Confirmar:

- [ ] `ProfitRankingCard` aparece à esquerda na desktop
- [ ] Mostra "Ranking de Lucro · Últimos 30 dias"
- [ ] Toggle Top 5 / Piores 5 funciona
- [ ] Pelo menos 1 produto listado (o seed cria 5 vendas)
- [ ] Click numa linha → vai para `/products/<id>`
- [ ] `StaleProductsCard` aparece à direita
- [ ] Mostra "Capital parado: R$ X em N produtos" no header
- [ ] Pelo menos 1 produto listado (seed cria 10 produtos, alguns sem venda)
- [ ] Ordenação: produtos NEVER_SOLD aparecem primeiro
- [ ] Layout responsivo: redimensionar para mobile faz os 2 cards stackarem

- [ ] **Step 5: Parar dev server**

`Ctrl+C` no terminal do dev (ou kill por PID — NUNCA `taskkill /IM node.exe`).

- [ ] **Step 6: Commit final marcando o bloco como entregue**

Não há código novo, mas vale uma tag/anotação:

```bash
git tag bloco-1-dashboard-inteligente
```

(opcional — se preferir, pular essa etapa).

- [ ] **Step 7: Atualizar memória do projeto**

Atualizar `~/.claude/projects/.../memory/project_current_task.md` registrando que o Bloco 1 foi entregue e listando o que vem no Bloco 1.5 (insights em frase + alertas inteligentes) ou no Bloco 2.

---

## Resumo das mudanças

| Categoria | Arquivos | Linhas (~) |
|---|---|---|
| Setup test infra | `vitest.config.ts`, `package.json` | ~30 |
| Tipos | `src/types/insights.ts` | ~60 |
| Service | `src/services/insights.service.ts` | ~200 |
| Testes | `src/services/__tests__/insights.service.test.ts` | ~250 |
| UI | `ProfitRankingCard.tsx`, `StaleProductsCard.tsx` | ~330 |
| Wire | `dashboard/page.tsx`, `DashboardClient.tsx` | ~30 (delta) |
| **Total** | **9 arquivos** | **~900 linhas** |

10 testes unitários verdes. Build verde. Smoke test manual aprovado. Pronto pro commit que fecha o Bloco 1 da Fase 2.
