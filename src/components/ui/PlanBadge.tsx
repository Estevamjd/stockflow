"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

interface PlanBadgeProps {
  plan: string;
  compact?: boolean;
}

const PLAN_STYLES: Record<string, { label: string; className: string }> = {
  free:       { label: "Free",       className: "bg-slate-700 text-slate-300 border-slate-600" },
  starter:    { label: "Starter",    className: "bg-sky-900/60 text-sky-300 border-sky-700" },
  pro:        { label: "Pro",        className: "bg-blue-600/20 text-blue-300 border-blue-600" },
  enterprise: { label: "Enterprise", className: "bg-violet-900/40 text-violet-300 border-violet-700" },
};

export function PlanBadge({ plan, compact = false }: PlanBadgeProps) {
  const style = PLAN_STYLES[plan?.toLowerCase()] ?? PLAN_STYLES.free;
  const isPaidPlan = plan !== "free";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-bold border ${style.className}`}
      >
        {isPaidPlan ? (
          <Zap className="w-3 h-3" />
        ) : null}
        {style.label}
      </span>

      {!isPaidPlan && !compact && (
        <Link
          href="/pricing"
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors whitespace-nowrap"
        >
          Fazer upgrade →
        </Link>
      )}
    </div>
  );
}
