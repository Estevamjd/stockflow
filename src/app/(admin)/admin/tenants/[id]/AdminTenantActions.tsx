"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function AdminTenantActions({ tenantId, currentPlan, isActive }: { tenantId: string, currentPlan: string, isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPlan = e.target.value;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan })
      });
      if (res.ok) {
        toast.success("Plano do lojista atualizado com sucesso!");
        router.refresh();
      } else {
        toast.error("Erro ao definir o novo plano");
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlock() {
    setLoading(true);
    toast.loading("Aplicando estado...", { id: "blockLoad" });
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive })
      });
      if (res.ok) {
        toast.success(isActive ? "Conta bloqueada com sucesso!" : "Conta ativada!", { id: "blockLoad" });
        router.refresh();
      } else {
        toast.error("Erro ao alterar acesso", { id: "blockLoad" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {isActive ? (
        <Badge variant="success" className="text-sm">Conta Ativa</Badge>
      ) : (
        <Badge variant="destructive" className="text-sm">Bloqueado</Badge>
      )}

      <select 
        value={currentPlan.toUpperCase()} 
        onChange={handlePlanChange} 
        disabled={loading}
        className="text-sm font-semibold border rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
      >
        <option value="FREE">Free</option>
        <option value="STARTER">Starter</option>
        <option value="PRO">Pro</option>
        <option value="ENTERPRISE">Enterprise</option>
      </select>

      <button 
        onClick={toggleBlock} 
        disabled={loading}
        className="text-sm font-semibold border rounded-md px-3 py-1.5 text-slate-600 hover:text-red-500 transition-colors bg-white hover:bg-slate-50"
      >
        {isActive ? "Bloquear Lojista" : "Desbloquear Lojista"}
      </button>
    </div>
  );
}
