import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { AdminService } from "@/services/admin.service";
import { logger } from "@/lib/logger";
import type { SessionUser } from "@/types";
import { PlanName } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/admin/tenants/:id
 *
 * Atualiza dados administrativos de um tenant: plano e/ou status ativo.
 * Defesa em profundidade — o middleware já barra não-SUPERADMIN, mas
 * o handler também valida a sessão para não depender só dele.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    if (!session || user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: tenantId } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { plan, isActive } = parsed.data;
    const adminUserId = user.id;

    // Bloqueio/desbloqueio
    if (typeof isActive === "boolean") {
      await AdminService.blockTenant(tenantId, !isActive, adminUserId);
    }

    // Mudança de plano (sincroniza tenant + subscription + audit)
    if (plan) {
      const planUpper = plan as PlanName;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan: planUpper },
      });

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { tenantId },
          data: { plan: planUpper },
        });
      }

      await prisma.billingEvent.create({
        data: {
          tenantId,
          type: "SUBSCRIPTION_UPGRADED",
          gateway: "manual",
          status: "processed",
          payload: { newPlan: planUpper, adminId: adminUserId },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[Admin Tenants PATCH] Erro inesperado");
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
