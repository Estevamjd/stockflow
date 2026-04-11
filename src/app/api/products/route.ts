import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductService } from "@/services/product.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError } from "@/lib/guards";
import { checkProductLimit } from "@/lib/plans";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().min(1, "SKU é obrigatório"),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  stockQuantity: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  unit: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const { searchParams } = req.nextUrl;

    const filters = {
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      lowStock: searchParams.get("lowStock") === "true",
      status: (searchParams.get("status") as "ACTIVE" | "INACTIVE") || undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
    };

    const result = await ProductService.getProducts(filters, tenantId);

    return NextResponse.json({
      success: true,
      data: result.products,
      meta: { total: result.total, page: filters.page, limit: filters.limit },
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
    const userId = (session?.user as { id?: string })?.id;

    // Verificar limite do plano
    const limitCheck = await checkProductLimit(tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Limite de produtos atingido (${limitCheck.current}/${limitCheck.limit}). Faça upgrade para continuar.`,
          code: "PLAN_LIMIT_REACHED",
          limit: limitCheck.limit,
          current: limitCheck.current,
          planKey: limitCheck.planKey,
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const parsed = createProductSchema.parse(body);

    const product = await ProductService.createProduct(parsed, tenantId, userId);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === "SKU já existe neste tenant") {
      return NextResponse.json({ success: false, error: "Este SKU já está em uso", code: "CONFLICT" }, { status: 409 });
    }
    const { status, message, code } = handleApiError(err);
    return NextResponse.json({ success: false, error: message, code }, { status });
  }
}
