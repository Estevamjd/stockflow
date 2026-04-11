import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportService } from "@/services/report.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";
import { planEnforcer } from "@/lib/plans/plan-enforcer";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const { searchParams } = req.nextUrl;

    const filters = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      channel: searchParams.get("channel") as never ?? undefined,
      status: searchParams.get("status") as never ?? undefined,
      format: (searchParams.get("format") ?? "json") as "json" | "csv",
    };

    await planEnforcer.checkFeatureAccess(tenantId, 'reports');
    if (filters.format === 'csv') {
      await planEnforcer.checkFeatureAccess(tenantId, 'exportCsv');
    }

    const rows = await ReportService.getSalesReport(tenantId, filters);

    if (filters.format === "csv") {
      const csv = Papa.unparse(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="vendas-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: rows, meta: { total: rows.length } });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
