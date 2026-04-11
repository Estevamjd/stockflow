import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";
import { getTenantUsage } from "@/lib/plans";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);

    const usage = await getTenantUsage(tenantId);
    return NextResponse.json({ success: true, data: usage });
  } catch (err) {
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
