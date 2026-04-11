"use client";

import dynamic from "next/dynamic";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle,
  DollarSign, ShoppingCart, BarChart3, Bell, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NotificationType } from "@prisma/client";
import { OnboardingChecklist } from "@/components/ui/OnboardingChecklist";

const RevenueChart = dynamic(() => import("./RevenueChart"), {
  ssr: false,
  loading: () => <div className="h-[240px] w-100% bg-muted/20 animate-pulse rounded-lg flex items-center justify-center text-xs text-muted-foreground">Carregando gráfico...</div>
});

const ChannelPieChart = dynamic(() => import("./ChannelPieChart"), { 
  ssr: false,
  loading: () => <div className="h-[240px] w-100% bg-muted/20 animate-pulse rounded-lg flex items-center justify-center text-xs text-muted-foreground">Carregando gráfico...</div>
});

function StatCard({
  title, value, subtitle, trend, icon: Icon, color = "indigo", href
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  color?: string;
  href?: string;
}) {
  const router = useRouter();
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div 
      onClick={() => href && router.push(href)}
      className={`bg-card border border-border rounded-xl p-5 flex flex-col gap-3 animate-fade-in transition-all ${href ? "cursor-pointer hover:bg-muted/30 hover:border-border/80" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${colorMap[color] ?? colorMap.indigo}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtitle || trend !== undefined) && (
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            trend >= 0
              ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend !== undefined && (
            <span className={`text-xs font-medium ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
              {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
};

interface Props {
  salesStats: {
    monthlyRevenue: number;
    monthlyProfit: number;
    todaySales: number;
    revenueChange: number;
    profitChange: number;
    todayRevenue?: number;
    todayProfit?: number;
  };
  inventoryStats: { totalUnits: number; lowStockCount: number; outOfStockCount: number };
  totalProducts: number;
  totalSales?: number;
  chartData: { date: string; revenue: number; profit: number }[];
  channelData: { channel: string; count: number; revenue: number }[];
  recentSales: {
    id: string;
    channel: string;
    customerName: string | null;
    totalAmount: number;
    status: string;
    saleDate: Date | string;
  }[];
  lowStockProducts: { id: string; name: string; sku: string; stockQuantity: number; minStockLevel: number }[];
  recentNotifications: Notification[];
  topProducts?: { name: string; sku: string; totalSold: number; totalRevenue: number }[];
  stockEntryCount?: number;
}

export function DashboardClient({
  salesStats, inventoryStats, totalProducts, chartData, channelData,
  recentSales, lowStockProducts, recentNotifications,
  stockEntryCount = 0, totalSales = 0,
}: Props) {
  const router = useRouter();

  const stats = [
    { title: "Produtos Ativos", value: totalProducts, icon: Package, color: "indigo", subtitle: "no catálogo", href: "/products?status=ACTIVE" },
    { title: "Total em Estoque", value: `${inventoryStats.totalUnits} un`, icon: BarChart3, color: "indigo", subtitle: "unidades totais", href: "/inventory" },
    { title: "Estoque Baixo", value: inventoryStats.lowStockCount, icon: AlertTriangle, color: "amber", subtitle: "produtos abaixo do mínimo", href: "/products?lowStock=true" },
    { title: "Receita do Mês", value: formatCurrency(salesStats.monthlyRevenue), icon: DollarSign, color: "green", trend: salesStats.revenueChange, subtitle: "vs mês anterior", href: "/reports/sales?period=month" },
    { title: "Lucro do Mês", value: formatCurrency(salesStats.monthlyProfit), icon: TrendingUp, color: "green", trend: salesStats.profitChange, subtitle: "vs mês anterior", href: "/reports/sales?period=month" },
    { title: "Vendas Hoje", value: salesStats.todaySales, icon: ShoppingCart, color: "indigo", subtitle: "pedidos no dia", href: "/sales?date=today" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Onboarding para novos usuários */}
      <OnboardingChecklist
        productCount={totalProducts}
        stockCount={stockEntryCount}
        saleCount={totalSales}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receita diária */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 transition-shadow hover:shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Receita dos últimos 30 dias</h2>
          <RevenueChart 
            data={chartData} 
            onChartClick={(date) => router.push(`/reports/sales?date=${date}`)} 
          />
        </div>

        {/* Canal de vendas */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Por canal</h2>
          {channelData.length > 0 ? (
            <ChannelPieChart 
              data={channelData} 
              onPieClick={(channel) => router.push(`/sales?channel=${channel}`)} 
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados</div>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vendas recentes */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Vendas Recentes</h2>
            <Link href="/sales" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada</p>
            ) : (
              recentSales.slice(0, 8).map((sale) => (
                <div 
                  key={sale.id} 
                  onClick={() => router.push(`/sales/${sale.id}`)}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{sale.customerName ?? "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">{sale.channel} · {formatDate(new Date(sale.saleDate))}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{formatCurrency(sale.totalAmount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          {/* Estoque baixo */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Estoque Baixo</h2>
              <Link href="/products?lowStock=true" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {lowStockProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum produto com estoque baixo 🎉</p>
              ) : (
                lowStockProducts.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px] group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stockQuantity === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                      {p.stockQuantity} un
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notificações recentes */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Alertas</h2>
              <Link href="/notifications" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentNotifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum alerta pendente ✅</p>
              ) : (
                recentNotifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <Bell className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
