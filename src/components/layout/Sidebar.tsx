"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { SessionUser } from "@/types";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  BarChart3,
  Bell,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/inventory/entries", label: "Entradas", icon: ArrowDownToLine },
  { href: "/inventory/exits", label: "Saídas", icon: ArrowUpFromLine },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface UsageData {
  planKey: string;
  plan: { name: string };
  usage: {
    products: { current: number; limit: number | null; percentage: number };
    salesMonth: { current: number; limit: number | null; percentage: number };
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/plan/usage")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUsage(json.data);
      })
      .catch(() => {});
  }, []);

  const planKey = usage?.planKey ?? "free";
  const isPaid = planKey !== "free";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="w-7 h-7 shrink-0" />
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight animate-fade-in">
              StockFlow
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* --- ADMIN LINK (SUPERADMIN apenas) --- */}
        {(session?.user as SessionUser | undefined)?.role === "SUPERADMIN" ? (
          <>
            <div className="border-t border-border my-2" />
            <Link
              href="/admin"
              title={collapsed ? "Painel Admin" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20",
                pathname.startsWith("/admin") && "bg-indigo-900/40 shadow-sm",
                collapsed && "justify-center px-2"
              )}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="animate-fade-in truncate">Painel Admin</span>}
            </Link>
          </>
        ) : null}
      </nav>

      {/* Plano e Upgrade */}
      {!collapsed && (
        <div className="px-3 pb-4 border-t border-border pt-3 space-y-3">
          {/* Info do Plano */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isPaid && <Zap className="w-3.5 h-3.5 text-blue-400" />}
              <span className="text-xs font-semibold text-foreground capitalize">
                Plano {usage?.plan.name ?? "Free"}
              </span>
            </div>
            {!isPaid && (
              <Link
                href="/pricing"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Upgrade →
              </Link>
            )}
          </div>

          {/* Barra de uso de produtos */}
          {usage && usage.usage.products.limit !== null && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Produtos</span>
                <span>
                  {usage.usage.products.current}/{usage.usage.products.limit}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usage.usage.products.percentage >= 90
                      ? "bg-red-500"
                      : usage.usage.products.percentage >= 70
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  )}
                  style={{ width: `${usage.usage.products.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Botão de upgrade (somente free) */}
          {!isPaid && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-600/30 text-blue-400 text-xs font-semibold transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Fazer upgrade para Pro
            </Link>
          )}
        </div>
      )}

      {/* Versão colapsada */}
      {collapsed && (
        <div className="px-2 pb-3 border-t border-border pt-3">
          <Link
            href="/pricing"
            title="Fazer upgrade"
            className="flex items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <TrendingUp className="w-5 h-5" />
          </Link>
        </div>
      )}
    </aside>
  );
}
