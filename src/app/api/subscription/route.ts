import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { SubscriptionService } from "@/services/subscription.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);

    const data = await SubscriptionService.getSubscriptionWithUsage(tenantId);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
