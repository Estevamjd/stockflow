import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportService } from "@/services/report.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";
import { planEnforcer } from "@/lib/plans/plan-enforcer";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const { searchParams } = req.nextUrl;

    await planEnforcer.checkFeatureAccess(tenantId, 'reports');

    const topProducts = await ReportService.getTopProducts(tenantId, {
      limit: parseInt(searchParams.get("limit") ?? "10"),
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json({ success: true, data: topProducts, meta: { total: topProducts.length } });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
