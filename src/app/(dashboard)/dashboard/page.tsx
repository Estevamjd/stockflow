import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { DashboardClient } from "./DashboardClient";
import { SaleService } from "@/services/sale.service";
import { InventoryService } from "@/services/inventory.service";
import { NotificationService } from "@/services/notification.service";
import { InsightsService } from "@/services/insights.service";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as { tenantId: string }).tenantId;

  // Buscar todos os dados em paralelo
  const [
    salesStats,
    inventoryStats,
    productData,
    chartData,
    channelData,
    recentSales,
    lowStockProducts,
    recentNotifications,
    profitRanking,
    staleProducts,
  ] = await Promise.all([
    SaleService.getSalesStats(tenantId),
    InventoryService.getStats(tenantId),
    prisma.product.count({ where: { tenantId, deletedAt: null, status: "ACTIVE" } }),
    SaleService.getRevenueChartData(tenantId),
    SaleService.getChannelDistribution(tenantId),
    SaleService.getSales(tenantId, { limit: 10, page: 1 }),
    prisma.product.findMany({
      where: { tenantId, deletedAt: null, status: "ACTIVE", stockQuantity: { lte: 5, gt: 0 } },
      select: { id: true, name: true, sku: true, stockQuantity: true, minStockLevel: true },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    }),
    NotificationService.getNotifications(tenantId, { unreadOnly: true, limit: 5 }),
    InsightsService.getProfitRanking(tenantId),
    InsightsService.getStaleProducts(tenantId),
  ]);

  return (
    <DashboardClient
      salesStats={salesStats}
      inventoryStats={inventoryStats}
      totalProducts={productData}
      chartData={chartData}
      channelData={channelData}
      recentSales={recentSales.sales}
      lowStockProducts={lowStockProducts}
      recentNotifications={recentNotifications.notifications}
      profitRanking={profitRanking}
      staleProducts={staleProducts}
    />
  );
}
