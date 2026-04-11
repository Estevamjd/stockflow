# Dashboard Inteligente — Bloco 1 da Fase 2

**Data:** 2026-04-11
**Status:** aprovado, aguardando plano de implementação
**Escopo:** primeiro bloco da Fase 2 (evolução de produto). Entrega dois widgets novos no dashboard: **Ranking de Lucro** e **Produtos Parados**.

---

## 1. Contexto e objetivo

A Fase 1 do StockFlow entregou um dashboard funcional com KPIs básicos, gráfico de receita, distribuição por canal e alertas simples de estoque baixo. A Fase 2 começa pela camada de **inteligência de produto** — sair de "exibir números" para "responder perguntas que o lojista realmente faz".

O Bloco 1 foca em duas perguntas concretas:

1. **"Quais produtos estão me dando mais lucro real (não só faturamento)?"** → Ranking de Lucro.
2. **"Tenho dinheiro parado em produto que não gira?"** → Produtos Parados.

Os outros dois itens listados pelo usuário no escopo original da Fase 2 (insights automáticos em frase + alertas inteligentes) ficam para um Bloco 1.5, porque eles **dependem** dos cálculos que este bloco entrega — implementá-los antes seria duplicar trabalho.

## 2. Decisões de produto (firmadas no brainstorming)

| Decisão | Valor |
|---|---|
| Definição de "produto parado" | **Híbrida**: sem venda há 60+ dias **OU** cobertura de estoque > 6 meses **OU** nunca vendeu |
| Ignorar produtos recém-cadastrados | Sim, `createdAt < 30 dias` é excluído de stale |
| Produto que nunca vendeu | **Conta** como parado (categoria mais crítica) |
| Produto `INACTIVE` | Excluído de tudo |
| Métricas do ranking | Lucro em **R$** + margem **%** lado a lado |
| Período do ranking | **30 dias** (hardcoded por enquanto, configurável depois) |
| Quantos | **Top 5 + Bottom 5** em abas |
| Posição no dashboard | Terceira linha, abaixo do que já existe (não reorganiza) |
| Estratégia de cálculo | Query direta no server component (sem cache, sem cron) |
| Estado vazio | Placeholder com CTA inteligente que considera se há integração ativa |

## 3. Arquitetura

### 3.1. Estrutura de arquivos

```
src/
├── services/
│   └── insights.service.ts                    ← NOVO
├── services/__tests__/
│   └── insights.service.test.ts               ← NOVO
├── app/(dashboard)/dashboard/
│   ├── page.tsx                               ← + 2 awaits no Promise.all
│   ├── DashboardClient.tsx                    ← + render dos 2 cards novos
│   ├── ProfitRankingCard.tsx                  ← NOVO (client component)
│   └── StaleProductsCard.tsx                  ← NOVO (client component)
└── types/
    └── insights.ts                            ← NOVO (tipos compartilhados)
```

### 3.2. Fluxo de dados

```
[ Browser ]
    ↓ GET /dashboard
[ dashboard/page.tsx — server component ]
    ↓ Promise.all([
    ↓   ...os 8 awaits existentes,
    ↓   InsightsService.getProfitRanking(tenantId),     ← NOVO
    ↓   InsightsService.getStaleProducts(tenantId),     ← NOVO
    ↓ ])
    ↓ props →
[ DashboardClient — client component ]
    ↓ <ProfitRankingCard data={profitRanking} />
    ↓ <StaleProductsCard data={staleProducts} />
```

Os componentes novos são client components apenas para suportar interação local (abas Top/Bottom no Ranking, tooltip de cobertura no Stale). Eles **não fazem fetch** — recebem tudo via props.

### 3.3. Por que `InsightsService` e não estender services existentes

Adicionar `getProfitRanking` em `SaleService` e `getStaleProducts` em `ProductService` distribuiria a lógica de "analytics" entre arquivos não relacionados. Os blocos seguintes da Fase 2 (insights em frase, alertas inteligentes, sugestão de reposição) vão pendurar mais métodos no mesmo conceito — concentrar tudo num service dedicado mantém boundary limpo.

## 4. Interface do `InsightsService`

### 4.1. Tipos públicos (em `src/types/insights.ts`)

```typescript
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
  bottom: ProfitRankingItem[];     // até 5, ordenado por totalProfit ASC (entre os que venderam)
  periodDays: 30;
  hasData: boolean;                // false → empty state
}

export type StaleReason = "NEVER_SOLD" | "NO_SALES_60D" | "HIGH_COVERAGE";

export interface StaleProduct {
  productId: string;
  name: string;
  sku: string;
  stockQuantity: number;
  stockValue: number;              // costPrice * stockQuantity
  daysSinceLastSale: number | null;  // null = nunca vendeu
  monthsOfCoverage: number | null;   // null se velocidade de venda = 0
  reason: StaleReason;
}

export interface StaleProductsReport {
  items: StaleProduct[];                  // máx 8 visíveis no card; ordenados por criticidade
  totalCount: number;                     // total real (pode ser > items.length)
  totalStockValue: number;                // soma de stockValue de TODOS os parados
  hasIntegrationActive: boolean;          // pra empty state inteligente
  hasData: boolean;
}
```

### 4.2. Constantes exportadas (thresholds)

```typescript
// src/services/insights.service.ts
export const INSIGHTS_THRESHOLDS = {
  RANKING_PERIOD_DAYS: 30,
  STALE_DAYS_NO_SALES: 60,
  STALE_MONTHS_COVERAGE: 6,
  STALE_MIN_PRODUCT_AGE_DAYS: 30,
  STALE_VELOCITY_WINDOW_DAYS: 90,  // janela pra calcular velocidade média
  CARD_TOP_LIMIT: 5,
  CARD_STALE_LIMIT: 8,
} as const;
```

Vira UI configurável no Bloco 2.

### 4.3. Métodos

```typescript
export class InsightsService {
  static async getProfitRanking(tenantId: string): Promise<ProfitRanking>;
  static async getStaleProducts(tenantId: string): Promise<StaleProductsReport>;
}
```

## 5. Queries

### 5.1. `getProfitRanking`

**Query 1 — agregação por produto (Prisma `groupBy`):**

```typescript
const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
```

**Query 2 — buscar metadados dos produtos top+bottom** (uma query única com `where IN`):

```typescript
const productIds = [...topIds, ...bottomIds];
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
  select: { id: true, name: true, sku: true, imageUrl: true },
});
```

**Pós-processamento:** combinar agregações + metadata, calcular `avgMargin = totalProfit / totalRevenue * 100`, ordenar e fatiar em top/bottom de 5. Total: **2 queries**.

### 5.2. `getStaleProducts`

**Query 1 — produtos elegíveis:**

```typescript
const minAge = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const products = await prisma.product.findMany({
  where: {
    tenantId,
    deletedAt: null,
    status: "ACTIVE",
    createdAt: { lt: minAge },
  },
  select: {
    id: true, name: true, sku: true, stockQuantity: true, costPrice: true, createdAt: true,
  },
});
```

**Query 2 — última venda por produto** (`groupBy` em `StockExit` com `_max(exitDate)`):

```typescript
const lastSales = await prisma.stockExit.groupBy({
  by: ["productId"],
  where: {
    tenantId,
    reason: "SALE",
    productId: { in: products.map(p => p.id) },
  },
  _max: { exitDate: true },
});
```

**Query 3 — velocidade de venda dos últimos 90 dias** (`groupBy` em `StockExit` com janela temporal):

```typescript
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
const velocity90d = await prisma.stockExit.groupBy({
  by: ["productId"],
  where: {
    tenantId,
    reason: "SALE",
    productId: { in: products.map(p => p.id) },
    exitDate: { gte: ninetyDaysAgo },
  },
  _sum: { quantity: true },
});
```

> **Por que duas queries em `StockExit`:** o Prisma `groupBy` não permite agregar `_max(exitDate)` (todo o histórico) e `_sum(quantity)` (filtrado para 90d) num mesmo statement, porque ambos os agregados compartilham o mesmo `where`. Separar é a forma mais limpa.

**Query 4 — verificação de integração ativa:**

```typescript
const hasIntegrationActive = (await prisma.integrationConfig.count({
  where: { tenantId, isActive: true, isMockMode: false },
})) > 0;
```

**Pós-processamento (in-memory):**

1. Para cada produto, lookup `lastSale` (do `_max.exitDate` da Query 2) e `velocity90d` (do `_sum.quantity` da Query 3).
2. Calcular `daysSinceLastSale`, `velocityPerDay = velocity90d / 90`, `monthsOfCoverage = stockQuantity / (velocityPerDay * 30)`.
3. Aplicar regra de classificação:
   - Sem `lastSale` → `NEVER_SOLD`
   - `daysSinceLastSale > 60` → `NO_SALES_60D`
   - `monthsOfCoverage > 6` → `HIGH_COVERAGE`
   - Caso contrário → não é parado, descarta
4. Ordenar: `NEVER_SOLD` > `NO_SALES_60D` (por `daysSinceLastSale` desc) > `HIGH_COVERAGE` (por `monthsOfCoverage` desc).
5. `totalStockValue` = soma de `stockValue` de **todos** os parados (não só os 8 visíveis).
6. `items` = primeiros 8 da ordenação.
7. `totalCount` = total de parados (pra mostrar "Ver todos (N)" no card).

**Total: 4 queries** para `getStaleProducts`.

### 5.3. Total do Bloco 1

**6 queries adicionais** no carregamento do dashboard (2 do ranking + 4 do stale). Todas usam índices que já existem (`Sale.saleDate`, `Sale.tenantId`, `SaleItem.productId`, `StockExit.productId`, `StockExit.exitDate`, `Product.tenantId`). Custo estimado em tenant médio: 30-80ms agregado. Aceitável.

## 6. UX dos componentes

### 6.1. `ProfitRankingCard`

**Estados:**
- **Com dados:** header com título "💰 Ranking de Lucro · 30 dias" + abas `[ Top 5 ][ Piores 5 ]`. Lista de itens com nome, SKU, lucro destacado e sublinha `Vendidos: X · Margem: Y%`. Click → `/products/{id}`.
- **< 5 produtos com vendas:** mostra os que tem (Top e Bottom mostram os mesmos invertidos) com aviso *"Apenas N produtos com vendas no período"*.
- **Empty (`hasData=false`):** ícone `TrendingUp` cinza + texto + CTA inteligente (vide 6.3).

**Aba ativa por padrão:** Top 5.

### 6.2. `StaleProductsCard`

**Estados:**
- **Com dados:** header destacando *"Capital parado: R$ X,XX em N produtos"* (esse é o número que dá o impacto). Lista com ícone por razão (🚫 nunca / ⏰ sem venda / 📦 cobertura), nome, SKU, sublinha com `qty un · R$ valor em estoque` + cobertura quando aplicável. Limita a 8 itens; se `totalCount > 8` mostra link "Ver todos (N)" → `/products` (página dedicada `/products?filter=stale` é placeholder no Bloco 1).
- **Empty:** ícone `CheckCircle` verde + *"Nenhum produto parado. Seu estoque está girando bem 🎯"*.

### 6.3. Empty state inteligente

Os dois cards compartilham essa lógica:

| Condição | Mensagem |
|---|---|
| `hasIntegrationActive=true` | *"Aguardando primeira venda sincronizada da [Shopee/etc]"* (sem CTA acionável) |
| `hasIntegrationActive=false` | *"Nenhuma venda nos últimos 30 dias."* + dois botões: `[Registrar venda manual]` (→ `/sales/new`) e `[Conectar loja]` (→ `/integrations`) |

### 6.4. Layout no `DashboardClient`

Adiciona uma terceira linha do grid, depois das notificações/estoque baixo:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <ProfitRankingCard data={profitRanking} />
  <StaleProductsCard data={staleProducts} />
</div>
```

Mobile: stack vertical. Desktop ≥1024px: lado a lado, 50/50.

## 7. Edge cases

| Cenário | Comportamento |
|---|---|
| Tenant sem produtos | Ambos cards: empty state |
| Tenant com produtos mas 0 vendas em 30d | Ranking: empty state. Stale: pode ter dados (todos os produtos viram `NEVER_SOLD` ou `NO_SALES_60D`) |
| Tenant com 3 produtos vendendo | Top mostra os 3, Bottom mostra os mesmos 3 invertidos + aviso |
| Produto com `profit ≤ 0` | Aparece normalmente — é exatamente o que interessa ver no Bottom 5 |
| Venda `CANCELLED`/`REFUNDED` | Excluída do agregado |
| Produto com `deletedAt != null` que ainda tem `SaleItem` antigo | A agregação (Query 1 do ranking) inclui o `productId`, mas a Query 2 (metadata) precisa filtrar `deletedAt: null` e descartar do resultado final |
| Produto que vendeu enquanto `ACTIVE` e depois ficou `INACTIVE` | **Aparece** no ranking — a venda histórica é real e o lucro também. A Query 2 (metadata) **não** filtra por `status`. Documentado como decisão consciente. |
| Produto `createdAt < 30 dias` | Excluído de stale; ainda pode aparecer no ranking se vendeu |
| Velocidade = 0 mas estoque = 0 | Não conta como parado (não tem o que parar) — cai na categoria "não classificado" e é descartado |
| `Decimal` do Prisma | Convertido para `number` no service antes de retornar; client recebe `number` puro |

## 8. Testes

Arquivo: `src/services/__tests__/insights.service.test.ts` (Vitest, mock do Prisma client).

| # | Caso | O que valida |
|---|---|---|
| 1 | `getProfitRanking` retorna top/bottom corretos com 6 produtos mockados | Ordenação por `totalProfit` |
| 2 | `getProfitRanking` filtra `CANCELLED`/`REFUNDED` | `where.status.notIn` aplicado |
| 3 | `getProfitRanking` retorna `hasData: false` com 0 vendas | Empty state |
| 4 | `getProfitRanking` com 3 produtos: top e bottom retornam os 3 | Limite < 5 |
| 5 | `getStaleProducts` classifica `NEVER_SOLD` corretamente | Sem `lastSale` |
| 6 | `getStaleProducts` classifica `NO_SALES_60D` corretamente | `lastSale` há 70 dias |
| 7 | `getStaleProducts` classifica `HIGH_COVERAGE` corretamente | Velocidade lenta + estoque alto |
| 8 | `getStaleProducts` ignora produtos `createdAt < 30d` | Filtro de elegibilidade |
| 9 | `getStaleProducts` ordena por criticidade | NEVER_SOLD > NO_SALES > COVERAGE |
| 10 | `getStaleProducts` retorna `hasIntegrationActive=true` quando há integração não-mock ativa | Empty state inteligente |

**Não testado nesta fase:** componentes React (UI). Foco no service onde está a lógica.

## 9. Performance

- **6 queries adicionais** no carregamento do dashboard.
- Todos os índices necessários **já existem** no schema atual (`Sale.saleDate`, `Sale.tenantId`, `SaleItem.productId`, `StockExit.productId`, `StockExit.exitDate`, `Product.tenantId`, `Product.status`).
- Custo estimado: 30-80ms agregado em tenant médio (até ~1k produtos, ~10k vendas/mês).
- Estratégia de escala (futura, **não** neste bloco): se algum tenant ultrapassar ~50k vendas/mês, migrar `InsightsService` para um pattern de cache via cron/snapshot table. **YAGNI** agora.

## 10. Fora de escopo (NÃO fazer no Bloco 1)

- Página dedicada `/insights`
- Rota `/products?filter=stale` (link existe, página não)
- Configuração de thresholds via UI (são `const` exportadas; UI vira no Bloco 2)
- Export PDF/Excel
- Insights em frase ("Suas vendas caíram X%")
- Alertas inteligentes (badge no header, etc)
- Ranking de margem absoluta como métrica principal (margem aparece como subtítulo, não como ordenação)
- Testes de UI dos componentes React

Esses entram nos blocos 1.5, 2 ou Fase 4 conforme prioridade.

## 11. Critério de pronto (Definition of Done)

```bash
npm run typecheck    # 0 erros
npm run lint         # 0 erros
npm test             # 10 testes verdes (insights.service.test.ts)
npm run build        # build verde
```

Mais teste manual: login com `demo@stockflow.com / demo123456`, abrir `/dashboard`, verificar:

1. Os 2 novos cards aparecem na terceira linha do grid.
2. `ProfitRankingCard` mostra Top 5 com pelo menos 1 produto (o seed tem 5 vendas).
3. `StaleProductsCard` mostra "Capital parado" no header — o seed tem 10 produtos, dos quais alguns nunca venderam.
4. Click em uma linha de qualquer card vai para `/products/{id}`.
5. Toggle de abas Top/Bottom no `ProfitRankingCard` funciona.
6. Layout responsivo: redimensionar pra mobile faz os cards stackarem.
