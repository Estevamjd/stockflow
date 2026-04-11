"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";

async function fetchExits() {
  const res = await fetch("/api/inventory/exits?limit=50");
  if (!res.ok) throw new Error("Erro");
  return res.json();
}

export default function ExitsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["stock-exits"], queryFn: fetchExits, staleTime: 30_000 });
  const exits = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saídas de Estoque</h1>
        <p className="text-sm text-muted-foreground mt-1">Histórico de baixas automáticas por vendas</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Produto", "SKU", "Quantidade", "Custo na Saída", "Motivo", "Referência", "Data"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}</tr>
                ))
              ) : exits.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhuma saída registrada</td></tr>
              ) : (
                exits.map((e: { id: string; product: { name: string; sku: string }; quantity: number; costAtExit: number; reason: string; referenceId?: string; exitDate: string }) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{e.product.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.product.sku}</td>
                    <td className="px-4 py-3 text-red-500 font-bold">-{e.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(e.costAtExit)}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-muted rounded-full">{e.reason}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{e.referenceId ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.exitDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
