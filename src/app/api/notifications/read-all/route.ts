import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";

export async function PATCH(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    await NotificationService.markAllAsRead(tenantId);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
