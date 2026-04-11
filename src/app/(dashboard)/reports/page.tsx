"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";

async function fetchSalesReport(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/reports/sales?${q}`);
  if (!res.ok) throw new Error("Erro");
  return res.json();
}

async function fetchTopProducts(from?: string, to?: string) {
  const params = new URLSearchParams({ limit: "10", ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const res = await fetch(`/api/reports/top-products?${params}`);
  if (!res.ok) throw new Error("Erro");
  return res.json();
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"sales" | "top">("sales");

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["report-sales", dateFrom, dateTo],
    queryFn: () => fetchSalesReport({ ...(dateFrom ? { from: dateFrom } : {}), ...(dateTo ? { to: dateTo } : {}) }),
    staleTime: 60_000,
  });

  const { data: topData, isLoading: loadingTop } = useQuery({
    queryKey: ["report-top", dateFrom, dateTo],
    queryFn: () => fetchTopProducts(dateFrom, dateTo),
    staleTime: 60_000,
  });

  function exportCSV(data: Record<string, unknown>[], filename: string) {
    if (!data.length) return;
    const csv = [Object.keys(data[0]).join(","), ...data.map((r) => Object.values(r).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel(data: Record<string, unknown>[], filename: string) {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, filename);
  }

  const salesRows = salesData?.data ?? [];
  const topRows = topData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Exporte dados para análise</p>
      </div>

      {/* Filtros de data */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Data início</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Data fim</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[{ key: "sales", label: "Vendas" }, { key: "top", label: "Top Produtos" }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key as "sales" | "top")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{salesRows.length} registro(s)</p>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(salesRows, "vendas.csv")}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                <FileText className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => exportExcel(salesRows, "vendas.xlsx")}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {salesRows.length > 0 && Object.keys(salesRows[0]).map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingSales ? (
                  <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">Carregando...</td></tr>
                ) : salesRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">Nenhum dado no período</td></tr>
                ) : (
                  salesRows.slice(0, 50).map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className="hover:bg-muted/30">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-foreground">{String(v)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "top" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Top {topRows.length} produtos</p>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(topRows, "top-produtos.csv")}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                <FileText className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => exportExcel(topRows, "top-produtos.xlsx")}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["#", "Produto", "SKU", "Qtd. Vendida", "Receita"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingTop ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
                ) : topRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum dado</td></tr>
                ) : (
                  topRows.map((p: { productId: string; productName: string; sku: string; totalQuantity: number; totalRevenue: number }, i: number) => (
                    <tr key={p.productId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-bold text-muted-foreground">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.productName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-bold">{p.totalQuantity}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(p.totalRevenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
