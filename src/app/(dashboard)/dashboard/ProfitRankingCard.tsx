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
