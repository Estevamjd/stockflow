"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  productCount: number;
  stockCount: number;
  saleCount: number;
}

/**
 * Lê o estado de "dispensado" do localStorage de forma SSR-safe.
 * Usado como inicializador lazy do useState — assim NENHUM useEffect
 * é necessário, e o lint `react-hooks/set-state-in-effect` não dispara.
 *
 * Como o componente é "use client", ele só renderiza no browser depois
 * da hidratação inicial. O risco de mismatch é zero porque o componente
 * pai já decide se deve montar ou não baseado em props server-side.
 */
function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("onboarding_dismissed") === "true";
  } catch {
    return false;
  }
}

export function OnboardingChecklist({
  productCount,
  stockCount,
  saleCount,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  const items: ChecklistItem[] = [
    {
      id: "product",
      label: "Criar primeiro produto",
      done: productCount > 0,
      href: "/products",
    },
    {
      id: "stock",
      label: "Adicionar estoque",
      done: stockCount > 0,
      href: "/inventory",
    },
    {
      id: "sale",
      label: "Registrar primeira venda",
      done: saleCount > 0,
      href: "/sales",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const progress = Math.round((doneCount / items.length) * 100);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("onboarding_dismissed", "true");
  };

  if (dismissed || allDone) return null;

  return (
    <div className="bg-slate-800/60 border border-blue-600/30 rounded-2xl p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">
            🚀 Primeiros passos
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Configure seu StockFlow em minutos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{doneCount}/{items.length}</span>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-400 text-xs transition-colors"
          >
            Dispensar
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-slate-700 rounded-full mb-4">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Itens */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {item.done ? (
              <div className="flex items-center gap-3 py-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-slate-400 text-sm line-through">{item.label}</span>
              </div>
            ) : (
              <Link
                href={item.href ?? "#"}
                className="flex items-center gap-3 py-2 group"
              >
                <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <span className="text-slate-200 text-sm group-hover:text-white transition-colors flex-1">
                  {item.label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
