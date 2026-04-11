import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SaleService } from "@/services/sale.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError, requireCan } from "@/lib/guards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "sale", "read");
    const sale = await SaleService.getSaleById(id, tenantId);
    if (!sale) return NextResponse.json({ success: false, error: "Venda não encontrada" }, { status: 404 });
    return NextResponse.json({ success: true, data: sale });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
