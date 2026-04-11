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
