import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MockShopeeClient } from "@/lib/shopee/mock-client";
import { requireTenant } from "@/lib/tenant";

// Bloqueado em produção pelo middleware
export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Não disponível em produção" }, { status: 401 });
  }

  try {
    const session = await getServerSession(authOptions);
    const tenantId = requireTenant(session);

    const mockClient = new MockShopeeClient(tenantId);
    const order = mockClient.generateOrder();
    const webhookPayload = mockClient.simulateWebhook(order);

    // Chamar internamente o endpoint do webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const webhookRes = await fetch(`${baseUrl}/api/webhooks/shopee`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "shopid": "12345" },
      body: JSON.stringify(webhookPayload),
    });

    const webhookResult = await webhookRes.json();

    return NextResponse.json({
      success: true,
      data: { order, webhookPayload, webhookResult },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
