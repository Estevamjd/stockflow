"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Search, Eye } from "lucide-react";
import Link from "next/link";

const CHANNEL_LABELS: Record<string, string> = {
  MANUAL: "Manual", SHOPEE: "Shopee", ELO7: "Elo7",
  MAGALU: "Magalu", MERCADO_LIVRE: "Mercado Livre", AMAZON: "Amazon", OTHER: "Outro",
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  PAID: { label: "Pago", color: "bg-green-100 text-green-700" },
  SHIPPED: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  DELIVERED: { label: "Entregue", color: "bg-indigo-100 text-indigo-700" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Reembolsado", color: "bg-gray-100 text-gray-600" },
};

async function fetchSales(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/sales?${q}`);
  if (!res.ok) throw new Error("Erro");
  return res.json();
}

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sales", search, channel, status],
    queryFn: () => fetchSales({ limit: "30", ...(search ? { search } : {}), ...(channel ? { channel } : {}), ...(status ? { status } : {}) }),
    staleTime: 30_000,
  });

  const sales = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">{data?.meta?.total ?? 0} venda(s) registrada(s)</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente ou pedido..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={channel} onChange={(e) => setChannel(e.target.value)}
          className="px-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">Todos os canais</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Cliente", "Canal", "Itens", "Total", "Lucro", "Status", "Data", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}</tr>
                ))
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Nenhuma venda encontrada</td></tr>
              ) : (
                sales.map((s: { id: string; customerName: string | null; channel: string; items: unknown[]; totalAmount: number; profit: number; status: string; saleDate: string; externalOrderId?: string }) => {
                  const statusInfo = STATUS_LABELS[s.status] ?? { label: s.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{s.customerName ?? "Cliente"}</p>
                          {s.externalOrderId && <p className="text-xs text-muted-foreground font-mono">{s.externalOrderId}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{CHANNEL_LABELS[s.channel] ?? s.channel}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.items.length} item(s)</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(s.totalAmount)}</td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400">{formatCurrency(s.profit)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(s.saleDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/sales/${s.id}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
