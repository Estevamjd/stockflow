import prisma from "@/lib/db";
import { PlanName } from "@/lib/plans/plan-limits";
import { WhatsAppService } from "@/lib/whatsapp/whatsapp.service";
import { Prisma, type Subscription } from "@prisma/client";
import { planEnforcer } from "@/lib/plans/plan-enforcer";

export class SubscriptionService {
  static async createFreeSubscription(tenantId: string, ownerEmail: string): Promise<Subscription> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Tenant não encontrado");

    const freeEndsAt = new Date();
    freeEndsAt.setFullYear(freeEndsAt.getFullYear() + 100);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        plan: "FREE",
        status: "ACTIVE",
        currentPeriodEnd: freeEndsAt,
        priceMonthly: 0,
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: "FREE" },
    });

    await WhatsAppService.sendToAdmin(
      WhatsAppService.formatNewTenant(tenant.name, "FREE", ownerEmail)
    );

    return subscription;
  }

  static async changePlan(tenantId: string, newPlan: PlanName, adminId: string): Promise<Subscription> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!tenant) throw new Error("Tenant não encontrado");

    const oldPlan = tenant.plan || "FREE";

    const updatedSub = await prisma.$transaction(async (tx) => {
      // 1. Atualizar Subscription
      const sub = await tx.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan: newPlan,
          status: "ACTIVE",
          currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        },
        update: {
          plan: newPlan,
          status: "ACTIVE",
        },
      });

      // 2. Atualizar Tenant plan
      await tx.tenant.update({
        where: { id: tenantId },
        data: { plan: String(newPlan) },
      });

      // 3. Billing Event
      await tx.billingEvent.create({
        data: {
          tenantId,
          type: "SUBSCRIPTION_UPGRADED",
          gateway: "manual", // Default, seria atualizado real no event
          status: "processed",
        },
      });

      // 4. Activity Log
      await tx.activityLog.create({
        data: {
          tenantId,
          userId: adminId,
          action: "CHANGE_PLAN",
          entity: "Subscription",
          details: { oldPlan, newPlan },
        },
      });

      return sub;
    });

    await WhatsAppService.sendToAdmin(
      WhatsAppService.formatPlanUpgrade(tenant.name, oldPlan, newPlan)
    );

    return updatedSub;
  }

  static async cancelSubscription(tenantId: string, reason: string, adminId: string): Promise<Subscription> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Tenant não encontrado");

    const sub = await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancelReason: reason,
      },
    });

    await prisma.billingEvent.create({
      data: {
        tenantId,
        type: "SUBSCRIPTION_CANCELED",
        gateway: "manual",
        status: "processed",
      },
    });

    await prisma.activityLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: "CANCEL_SUBSCRIPTION",
        entity: "Subscription",
        details: { reason },
      },
    });

    await WhatsAppService.sendToAdmin(
      WhatsAppService.formatPlanCancel(tenant.name, sub.plan, reason)
    );

    return sub;
  }

  static async handlePaymentSucceeded(tenantId: string, payload: unknown, gateway: string): Promise<void> {
    await prisma.billingEvent.create({
      data: {
        tenantId,
        type: "PAYMENT_SUCCEEDED",
        gateway,
        status: "processed",
        payload: payload as Prisma.InputJsonValue,
      },
    });

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +30 dias
      },
    });
  }

  static async handlePaymentFailed(tenantId: string, amount: number, payload: unknown, gateway: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;

    await prisma.billingEvent.create({
      data: {
        tenantId,
        type: "PAYMENT_FAILED",
        gateway,
        status: "processed",
        amount,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "PAST_DUE",
      },
    });

    await WhatsAppService.sendToAdmin(
      WhatsAppService.formatPaymentFailed(tenant.name, amount)
    );
  }

  static async getSubscriptionWithUsage(tenantId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });
    
    const usage = await planEnforcer.getUsage(tenantId);
    
    return {
      subscription,
      usage,
    };
  }

  static isActive(subscription: Subscription | null): boolean {
    if (!subscription) return false;
    return subscription.status === "ACTIVE" || subscription.status === "TRIALING";
  }
}
