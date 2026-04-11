import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError, requireCan } from "@/lib/guards";
import { z } from "zod";

const createEntrySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("Quantidade deve ser positiva"),
  unitCost: z.number().min(0, "Custo não pode ser negativo"),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  entryDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "inventory", "read");
    const { searchParams } = req.nextUrl;

    const result = await InventoryService.getStockEntries(tenantId, {
      productId: searchParams.get("productId") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
    });

    return NextResponse.json({
      success: true,
      data: result.entries,
      meta: { total: result.total },
    });
  } catch (err) {
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "inventory", "create");
    const userId = (session?.user as { id?: string })?.id;

    const body = await req.json();
    const parsed = createEntrySchema.parse(body);

    const entry = await InventoryService.createStockEntry(
      { ...parsed, entryDate: parsed.entryDate ? new Date(parsed.entryDate) : undefined },
      tenantId,
      userId
    );

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
