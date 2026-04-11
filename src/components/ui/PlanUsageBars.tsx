"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageData {
  products: { used: number; limit: number };
  users: { used: number; limit: number };
  sales: { used: number; limit: number };
  integrations: { used: number; limit: number };
  plan: string;
}

export function PlanUsageBars() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.usage) {
          // Flatten as properties
          setUsage({
             ...data.data.usage,
             plan: data.data.subscription?.plan || 'FREE'
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>;
  }

  if (!usage) return null;

  const renderBar = (label: string, data: { used: number; limit: number }) => {
    const isUnlimited = data.limit === -1;
    let percentage = 0;
    if (!isUnlimited && data.limit > 0) {
       percentage = Math.min((data.used / data.limit) * 100, 100);
    }
    const colorClass = percentage > 90 ? "bg-red-500" : percentage > 75 ? "bg-amber-500" : "bg-blue-600";

    return (
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <span className="text-slate-500">
            {data.used} / {isUnlimited ? "Ilimitado" : data.limit}
          </span>
        </div>
        <Progress value={isUnlimited ? 0 : percentage} className="h-2" indicatorClassName={isUnlimited ? "bg-slate-300" : colorClass} />
        {percentage >= 100 && !isUnlimited && (
          <p className="text-xs text-red-500 mt-1">Limite atingido. Faça upgrade!</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-1">Uso do Plano: {usage.plan}</h3>
      <p className="text-sm text-slate-500 mb-6">Acompanhe os limites de consumo da sua loja.</p>
      
      {renderBar("Produtos Cadastrados", usage.products)}
      {renderBar("Vendas (Mês Atual)", usage.sales)}
      {renderBar("Usuários Extras", usage.users)}
      {renderBar("Integrações Ativas", usage.integrations)}
    </div>
  );
}
