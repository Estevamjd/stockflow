import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const { searchParams } = req.nextUrl;
    const unreadOnly = searchParams.get("unread") === "true";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const [{ notifications, total }, unreadCount] = await Promise.all([
      NotificationService.getNotifications(tenantId, { unreadOnly, page, limit }),
      NotificationService.getUnreadCount(tenantId),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: { total, unreadCount },
    });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
