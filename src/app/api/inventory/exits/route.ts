import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const { searchParams } = req.nextUrl;

    const result = await InventoryService.getStockExits(tenantId, {
      productId: searchParams.get("productId") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
    });

    return NextResponse.json({
      success: true,
      data: result.exits,
      meta: { total: result.total },
    });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
