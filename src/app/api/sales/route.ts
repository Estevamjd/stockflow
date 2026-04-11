import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SaleService } from "@/services/sale.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError, requireCan } from "@/lib/guards";
import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

const createSaleSchema = z.object({
  channel: z.enum(["MANUAL", "SHOPEE", "ELO7", "MAGALU", "MERCADO_LIVRE", "AMAZON", "OTHER"]).optional(),
  externalOrderId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  items: z.array(saleItemSchema).min(1, "Informe pelo menos um item"),
  discount: z.number().min(0).optional(),
  shippingCost: z.number().min(0).optional(),
  notes: z.string().optional(),
  saleDate: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "sale", "read");
    const { searchParams } = req.nextUrl;

    const result = await SaleService.getSales(tenantId, {
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
      channel: searchParams.get("channel") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
      search: searchParams.get("search") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.sales,
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
    requireCan(session, "sale", "create");
    const userId = (session?.user as { id?: string })?.id;

    const body = await req.json();
    const parsed = createSaleSchema.parse(body);

    const sale = await SaleService.createSale(
      { ...parsed, saleDate: parsed.saleDate ? new Date(parsed.saleDate) : undefined },
      tenantId,
      userId
    );

    return NextResponse.json({ success: true, data: sale }, { status: 201 });
  } catch (err) {
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
