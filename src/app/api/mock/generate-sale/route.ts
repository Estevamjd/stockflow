import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SaleService } from "@/services/sale.service";
import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";

// Bloqueado em produção pelo middleware
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Não disponível em produção" }, { status: 401 });
  }

  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);
    const userId = (session?.user as { id?: string })?.id;

    // Gerar pedido mock com produtos reais do tenant
    const products = await prisma.product.findMany({
      where: { tenantId, deletedAt: null, status: "ACTIVE", stockQuantity: { gt: 0 } },
      select: { id: true, salePrice: true, stockQuantity: true, name: true },
      take: 7,
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum produto com estoque disponível" },
        { status: 400 }
      );
    }

    // Selecionar 1–3 produtos aleatórios
    const itemCount = Math.min(Math.floor(Math.random() * 3) + 1, products.length);
    const selectedProducts = [...products]
      .sort(() => Math.random() - 0.5)
      .slice(0, itemCount);

    const items = selectedProducts.map((p) => ({
      productId: p.id,
      quantity: 1,
      unitPrice: Number(p.salePrice),
    }));

    const sale = await SaleService.createSale(
      {
        channel: "SHOPEE",
        externalOrderId: `MOCK${Date.now()}`,
        customerName: "Cliente Mock Shopee",
        items,
        status: "PAID",
      },
      tenantId,
      userId
    );

    return NextResponse.json({ success: true, data: sale }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
