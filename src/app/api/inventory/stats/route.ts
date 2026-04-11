import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const stats = await InventoryService.getStats(tenantId);
    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
