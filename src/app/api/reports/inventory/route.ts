import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportService } from "@/services/report.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError, requireCan } from "@/lib/guards";
import { planEnforcer } from "@/lib/plans/plan-enforcer";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "report", "read");
    const format = req.nextUrl.searchParams.get("format") ?? "json";

    await planEnforcer.checkFeatureAccess(tenantId, 'reports');
    if (format === 'csv') {
      await planEnforcer.checkFeatureAccess(tenantId, 'exportCsv');
    }

    const rows = await ReportService.getInventoryReport(tenantId);

    if (format === "csv") {
      const csv = Papa.unparse(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="estoque-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: rows, meta: { total: rows.length } });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
