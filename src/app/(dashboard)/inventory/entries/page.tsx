"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

async function fetchProducts() {
  const res = await fetch("/api/products?limit=100");
  if (!res.ok) throw new Error("Erro");
  const data = await res.json();
  return data.data as { id: string; name: string; sku: string; stockQuantity: number; costPrice: number }[];
}

async function fetchEntries(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/inventory/entries?${q}`);
  if (!res.ok) throw new Error("Erro");
  return res.json();
}

export default function EntriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ productId: "", quantity: "", unitCost: "", supplier: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: products } = useQuery({ queryKey: ["products-list"], queryFn: fetchProducts, staleTime: 60_000 });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-entries"],
    queryFn: () => fetchEntries({ limit: "50" }),
    staleTime: 30_000,
  });

  const selectedProduct = products?.find((p) => p.id === formData.productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, quantity: parseInt(formData.quantity), unitCost: parseFloat(formData.unitCost) }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Entrada registrada! Estoque atualizado.");
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowModal(false);
      setFormData({ productId: "", quantity: "", unitCost: "", supplier: "", notes: "" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const entries = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entradas de Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de reposições de produtos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Nova Entrada
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Produto", "SKU", "Quantidade", "Custo Unit.", "Total", "Custo Médio Após", "Fornecedor", "Data"].map((h) => (
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
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Nenhuma entrada registrada</td></tr>
              ) : (
                entries.map((e: {
                  id: string;
                  product: { name: string; sku: string };
                  quantity: number;
                  unitCost: number | string;
                  totalCost: number | string;
                  averageCostAfter: number | string;
                  supplier?: string;
                  entryDate: string;
                }) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{e.product.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.product.sku}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-bold">+{e.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(e.unitCost)}</td>
                    <td className="px-4 py-3">{formatCurrency(e.totalCost)}</td>
                    <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{formatCurrency(e.averageCostAfter)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.supplier ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.entryDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nova entrada */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Nova Entrada de Estoque</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Produto *</label>
                <select required value={formData.productId} onChange={(e) => setFormData((p) => ({ ...p, productId: e.target.value, unitCost: products?.find(pr => pr.id === e.target.value)?.costPrice?.toString() ?? "" }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Selecione...</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.stockQuantity} em estoque</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Quantidade *</label>
                  <input type="number" min="1" required value={formData.quantity} onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Custo Unit. (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={formData.unitCost} onChange={(e) => setFormData((p) => ({ ...p, unitCost: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              {/* Preview CMP */}
              {selectedProduct && formData.quantity && formData.unitCost && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs rounded-lg px-3 py-2">
                  Novo CMP estimado: {formatCurrency(
                    (selectedProduct.stockQuantity * selectedProduct.costPrice + parseInt(formData.quantity) * parseFloat(formData.unitCost)) /
                    (selectedProduct.stockQuantity + parseInt(formData.quantity))
                  )} | Novo estoque: {selectedProduct.stockQuantity + parseInt(formData.quantity)} un
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
                <input value={formData.supplier} onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                  {loading ? "Registrando..." : "Registrar Entrada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
