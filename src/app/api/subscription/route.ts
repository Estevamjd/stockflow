import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { handleApiError, requireCan } from "@/lib/guards";
import { SubscriptionService } from "@/services/subscription.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "subscription", "read");

    const data = await SubscriptionService.getSubscriptionWithUsage(tenantId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
