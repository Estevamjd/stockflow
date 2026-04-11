import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { requireRole, handleApiError } from "@/lib/guards";
import { getBillingProvider } from "@/lib/billing/billing.factory";
import { PlanName } from "@/lib/plans/plan-limits";
import { AppError, ErrorCodes } from "@/lib/errors";
import prisma from "@/lib/db";
import type { SessionUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireRole(session, "ADMIN"); // somente ADMIN/OWNER/SUPERADMIN podem mudar plano
    const user = session?.user as SessionUser | undefined;

    const { planName, successUrl, cancelUrl } = await req.json();

    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) {
      throw new AppError("Assinatura não encontrada", 404, ErrorCodes.NOT_FOUND);
    }

    const provider = getBillingProvider();

    // Como é manual, ele pula pro success url ou simulamos
    if (provider.provider === "manual") {
      const { SubscriptionService } = await import("@/services/subscription.service");
      await SubscriptionService.changePlan(tenantId, planName as PlanName, user?.id || "");
      return NextResponse.json({ success: true, url: successUrl });
    }

    // Provedor Real (Stripe/MP)
    const customerId = sub.stripeCustomerId || sub.mercadoPagoCustomerId;
    if (!customerId) {
      throw new AppError(
        "Cliente não sincronizado com gateway",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const url = await provider.createCheckoutSession(
      customerId,
      planName as PlanName,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ success: true, url });
  } catch (err) {
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
