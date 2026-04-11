import prisma from "@/lib/db";
import { type NotificationType, Prisma } from "@prisma/client";

interface CreateNotificationInput {
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  static async createNotification(data: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }

  static async getNotifications(
    tenantId: string,
    options?: { unreadOnly?: boolean; limit?: number; page?: number }
  ) {
    const { unreadOnly = false, limit = 20, page = 1 } = options ?? {};

    const where = {
      tenantId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  static async getUnreadCount(tenantId: string): Promise<number> {
    return prisma.notification.count({
      where: { tenantId, isRead: false },
    });
  }

  static async markAsRead(id: string, tenantId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, tenantId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async markAllAsRead(tenantId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async createNewSaleNotification(
    tenantId: string,
    saleData: { id: string; totalAmount: number; channel: string; customerName?: string | null }
  ) {
    return this.createNotification({
      tenantId,
      type: "NEW_SALE",
      title: "Nova venda registrada",
      message: `Venda de R$ ${Number(saleData.totalAmount).toFixed(2)} via ${saleData.channel}${saleData.customerName ? ` para ${saleData.customerName}` : ""}.`,
      link: `/sales/${saleData.id}`,
      metadata: { saleId: saleData.id, channel: saleData.channel },
    });
  }

  static async createIntegrationErrorNotification(
    tenantId: string,
    error: string
  ) {
    return this.createNotification({
      tenantId,
      type: "INTEGRATION_ERROR",
      title: "Erro na integração Shopee",
      message: error,
      link: "/integrations",
    });
  }
}
