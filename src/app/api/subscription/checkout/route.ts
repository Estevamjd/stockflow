import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getBillingProvider } from "@/lib/billing/billing.factory";
import { PlanName } from "@/lib/plans/plan-limits";
import prisma from "@/lib/db";
import type { SessionUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    
    // Validar role (apenas owner/admin deveria mudar plano idealmente)
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem alterar planos" }, { status: 403 });
    }

    const { planName, successUrl, cancelUrl } = await req.json();

    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
    }

    const provider = getBillingProvider();
    
    // Como é manual, ele pula pro success url ou simulamos
    if (provider.provider === 'manual') {
      // Simularia direto o Upgrade 
      const { SubscriptionService } = await import("@/services/subscription.service");
      await SubscriptionService.changePlan(tenantId, planName as PlanName, user?.id || "");
      return NextResponse.json({ success: true, url: successUrl });
    }

    // Provedor Real (Stripe/MP)
    const customerId = sub.stripeCustomerId || sub.mercadoPagoCustomerId;
    if (!customerId) {
       return NextResponse.json({ error: "Cliente não sincronizado com gateway" }, { status: 400 });
    }

    const url = await provider.createCheckoutSession(customerId, planName as PlanName, successUrl, cancelUrl);
    
    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
