import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductService } from "@/services/product.service";
import { requireTenant } from "@/lib/tenant";
import { handleApiError, requireCan } from "@/lib/guards";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  costPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "product", "read");
    const product = await ProductService.getProductById(id, tenantId);
    if (!product) {
      return NextResponse.json({ success: false, error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "product", "update");
    const userId = (session?.user as { id?: string })?.id;

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Converter null → undefined para `categoryId` (Prisma aceita undefined
    // como "não atualizar", mas Zod aceita null como "limpar"). O service
    // distingue por undefined.
    const updateData = {
      ...parsed.data,
      categoryId: parsed.data.categoryId ?? undefined,
      description: parsed.data.description ?? undefined,
    };

    const { id } = await params;
    const product = await ProductService.updateProduct(id, updateData, tenantId, userId);
    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    requireCan(session, "product", "delete");
    const userId = (session?.user as { id?: string })?.id;

    const { id } = await params;
    await ProductService.deleteProduct(id, tenantId, userId);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    const { status, message } = handleApiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
