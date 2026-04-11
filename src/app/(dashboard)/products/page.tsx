"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Draggable from "react-draggable";
import { toast } from "sonner";
import * as Select from "@radix-ui/react-select";
import * as Tooltip from "@radix-ui/react-tooltip";
import { 
  Plus, Search, RefreshCw, Pencil, Trash2, 
  AlertTriangle, HelpCircle, ChevronDown, Check 
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProductWithCategory } from "@/types";

async function fetchProducts(params: Record<string, string>): Promise<{ data: ProductWithCategory[]; meta: { total: number } }> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/products?${query}`);
  if (!res.ok) throw new Error("Erro ao buscar produtos");
  return res.json();
}

async function deleteProduct(id: string) {
  const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erro ao excluir produto");
}

function ProductFormModal({ product, onClose, onSave }: {
  product?: ProductWithCategory | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    costPrice: product?.costPrice?.toString() ?? "0",
    salePrice: product?.salePrice?.toString() ?? "0",
    minStockLevel: product?.minStockLevel?.toString() ?? "5",
    unit: product?.unit ?? "un",
    description: product?.description ?? "",
  });

  // Novos estados para cálculo de estoque
  const [qtyBought, setQtyBought] = useState(isEdit ? product?.stockQuantity ?? 1 : 1);
  const [itemsPerUnit, setItemsPerUnit] = useState(1);
  const [loading, setLoading] = useState(false);

  // Efeito para resetar itemsPerUnit se for unidade
  useEffect(() => {
    if (form.unit === "un") {
      setItemsPerUnit(1);
    }
  }, [form.unit]);

  const totalStock = Math.floor(Number(qtyBought || 0) * Number(itemsPerUnit || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        ...form,
        costPrice: parseFloat(form.costPrice),
        salePrice: parseFloat(form.salePrice),
        minStockLevel: parseInt(form.minStockLevel),
        stockQuantity: totalStock, // Enviar estoque calculado
      };
      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(isEdit ? "Produto atualizado!" : "Produto criado!");
      onSave();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const nodeRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  return (
    <Tooltip.Provider>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <Draggable
          nodeRef={nodeRef}
          handle=".modal-header"
          bounds="parent"
        >
          <div 
            ref={nodeRef}
            className="bg-background border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative select-none flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Draggable */}
            <div className="modal-header cursor-grab active:cursor-grabbing pb-4 -mx-6 px-6 -mt-6 pt-6 border-b border-border/50 mb-4 rounded-t-2xl hover:bg-muted/30 transition-colors shrink-0">
              <h2 className="text-lg font-semibold text-foreground select-none">{isEdit ? "Editar Produto" : "Novo Produto"}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                  <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">SKU *</label>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content 
                          className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg max-w-[200px] z-[60]"
                          sideOffset={5}
                        >
                          SKU é um código único usado para identificar o produto no estoque. Exemplo: TUB-13-KRAFT
                          <Tooltip.Arrow className="fill-slate-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                  <input required value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tipo de Unidade</label>
                  <Select.Root 
                    value={form.unit} 
                    onValueChange={(val) => setForm((p) => ({ ...p, unit: val }))}
                  >
                    <Select.Trigger className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors">
                      <Select.Value placeholder="Selecione..." />
                      <Select.Icon>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Select.Icon>
                    </Select.Trigger>
                    
                    <Select.Portal>
                      <Select.Content 
                        className="overflow-hidden bg-slate-900 rounded-lg border border-slate-700 shadow-xl z-[70] min-w-[var(--radix-select-trigger-width)]"
                        position="popper"
                        sideOffset={5}
                      >
                        <Select.Viewport className="p-1">
                          {[
                            { value: "un", label: "Unidade (un)" },
                            { value: "caixa", label: "Caixa" },
                            { value: "kit", label: "Kit" },
                            { value: "pacote", label: "Pacote" }
                          ].map((opt) => (
                            <Select.Item 
                              key={opt.value} 
                              value={opt.value}
                              className="relative flex items-center px-8 py-2 text-xs text-slate-100 rounded-md cursor-pointer select-none outline-none focus:bg-slate-800 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white transition-colors"
                            >
                              <Select.ItemText>{opt.label}</Select.ItemText>
                              <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {/* Seção de Cálculo de Estoque */}
                <div className="col-span-2 grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Qtd. Adquirida ({form.unit})</label>
                    <input type="number" min="1" value={qtyBought} onChange={(e) => setQtyBought(parseInt(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      {form.unit === "un" ? "Itens por unidade" : `Itens por ${form.unit}`}
                    </label>
                    <input type="number" min="1" disabled={form.unit === "un"} value={itemsPerUnit} onChange={(e) => setItemsPerUnit(parseInt(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1 border-t border-border/30 mt-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Estoque Resultante:</span>
                    <span className="text-sm font-bold text-primary">{totalStock} unidades (un)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Custo (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Preço de Venda (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Alerta de Estoque Mínimo</label>
                  <input type="number" min="0" value={form.minStockLevel} onChange={(e) => setForm((p) => ({ ...p, minStockLevel: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
              </div>
              
              {form.costPrice && form.salePrice && parseFloat(form.salePrice) > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-lg px-3 py-2">
                  Margem estimada: {formatPercent(((parseFloat(form.salePrice) - parseFloat(form.costPrice)) / parseFloat(form.salePrice)) * 100)}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </Draggable>
      </div>
    </Tooltip.Provider>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["products", search, lowStock],
    queryFn: () => fetchProducts({
      ...(search ? { search } : {}),
      ...(lowStock ? { lowStock: "true" } : {}),
    }),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Produto excluído");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Erro ao excluir produto"),
  });

  const products = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.meta?.total ?? 0} produto(s) cadastrado(s)</p>
        </div>
        <button onClick={() => { setEditProduct(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..." className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} className="rounded" />
          Apenas estoque baixo
        </label>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Nome", "SKU", "Estoque", "Custo", "Preço", "Margem", "Status", "Ações"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {lowStock ? "Nenhum produto com estoque baixo 🎉" : "Nenhum produto cadastrado"}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        {p.category && <p className="text-xs text-muted-foreground">{p.category.name}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.stockQuantity === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : p.stockQuantity <= p.minStockLevel ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                        {p.stockQuantity === 0 && <AlertTriangle className="w-3 h-3" />}
                        {p.stockQuantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(p.costPrice)}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{formatCurrency(p.salePrice)}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{formatPercent(p.profitMargin)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditProduct(p); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de produto */}
      {showModal && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          onSave={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        />
      )}

      {/* Confirm delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-foreground mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-muted-foreground mb-4">Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
