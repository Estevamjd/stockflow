import crypto from "crypto";
import { logger } from "@/lib/logger";
import { MockShopeeClient } from "./mock-client";
import type { IShopeeClient } from "./client.interface";
import type {
  GetOrdersParams,
  GetOrdersResponse,
  ShopeeOrder,
} from "./types";

const BASE_URL = "https://partner.shopeemobile.com";
const SANDBOX_URL = "https://partner.test-stable.shopeemobile.com";

export class RealShopeeClient implements IShopeeClient {
  private partnerId: string;
  private partnerKey: string;
  private shopId: string;
  private accessToken: string;
  private isSandbox: boolean;
  private baseUrl: string;

  constructor(config: {
    partnerId: string;
    partnerKey: string;
    shopId: string;
    accessToken: string;
    env?: "sandbox" | "production";
  }) {
    this.partnerId = config.partnerId;
    this.partnerKey = config.partnerKey;
    this.shopId = config.shopId;
    this.accessToken = config.accessToken;
    this.isSandbox = config.env !== "production";
    this.baseUrl = this.isSandbox ? SANDBOX_URL : BASE_URL;
  }

  private generateSignature(apiPath: string, timestamp: number): string {
    const baseString = `${this.partnerId}${apiPath}${timestamp}${this.accessToken}${this.shopId}`;
    return crypto
      .createHmac("sha256", this.partnerKey)
      .update(baseString)
      .digest("hex");
  }

  private getHeaders(apiPath: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(apiPath, timestamp);
    return {
      "Content-Type": "application/json",
      partner_id: this.partnerId,
      timestamp: String(timestamp),
      access_token: this.accessToken,
      shop_id: this.shopId,
      sign,
    };
  }

  private async fetchWithRetry<T>(
    apiPath: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${apiPath}`);
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(apiPath, timestamp);

    url.searchParams.set("partner_id", this.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("shop_id", this.shopId);
    url.searchParams.set("sign", sign);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }

    let lastError: Error = new Error("Unknown error");

    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(url.toString(), {
          headers: this.getHeaders(apiPath),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`Shopee API error: ${res.status} ${res.statusText}`);
        }

        return res.json() as T;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err as Error;
        
        if (attempt < 2) {
          const backoff = Math.pow(2, attempt) * 1000;
          logger.warn({ apiPath, attempt, backoff, err: lastError }, "[Shopee API] Rate limit ou erro temporário — tentando novamente");
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          logger.error({ apiPath, attempt, err: lastError }, "[Shopee API] Falha final após retries");
        }
      }
    }

    throw lastError;
  }

  async getOrders(params?: GetOrdersParams): Promise<GetOrdersResponse> {
    const apiPath = "/api/v2/order/get_order_list";
    const now = Math.floor(Date.now() / 1000);
    const queryParams = {
      time_range_field: params?.time_range_field ?? "create_time",
      time_from: params?.time_from ?? now - 86400 * 7,
      time_to: params?.time_to ?? now,
      page_size: params?.page_size ?? 50,
      ...(params?.cursor ? { cursor: params.cursor } : {}),
      ...(params?.order_status ? { order_status: params.order_status } : {}),
      response_optional_fields: "order_status",
    };

    const data = await this.fetchWithRetry<{
      response: {
        order_list: Array<{ order_sn: string; order_status: string }>;
        next_cursor: string;
        has_next_page: boolean;
        total_count: number;
      };
      error?: string;
    }>(apiPath, queryParams as Record<string, string | number>);

    if (data.error) throw new Error(`Shopee API: ${data.error}`);

    // Buscar detalhes dos pedidos
    const orders = await Promise.all(
      data.response.order_list.map((o) => this.getOrderDetail(o.order_sn))
    );

    return {
      orders,
      next_cursor: data.response.next_cursor,
      has_next_page: data.response.has_next_page,
      total: data.response.total_count,
    };
  }

  async getOrderDetail(orderId: string): Promise<ShopeeOrder> {
    const apiPath = "/api/v2/order/get_order_detail";
    const data = await this.fetchWithRetry<{
      response: { order_list: ShopeeOrder[] };
      error?: string;
    }>(apiPath, {
      order_sn_list: orderId,
      response_optional_fields: "buyer_user_id,buyer_username,recipient_address,actual_shipping_fee,item_list,pay_time,total_amount",
    });

    if (data.error) throw new Error(`Shopee API: ${data.error}`);
    const order = data.response.order_list[0];
    if (!order) throw new Error(`Pedido não encontrado: ${orderId}`);
    return order;
  }

  async updateStock(sku: string, quantity: number): Promise<boolean> {
    // Implementação básica — requer item_id e model_id reais
    console.log(`[RealShopee] updateStock: SKU=${sku}, qty=${quantity}`);
    return true;
  }
}

// Factory function: retorna mock ou real dependendo das variáveis de ambiente
export function createShopeeClient(tenantId: string): IShopeeClient {
  if (!process.env.SHOPEE_PARTNER_ID) {
    return new MockShopeeClient(tenantId);
  }

  return new RealShopeeClient({
    partnerId: process.env.SHOPEE_PARTNER_ID!,
    partnerKey: process.env.SHOPEE_PARTNER_KEY!,
    shopId: process.env.SHOPEE_SHOP_ID!,
    accessToken: process.env.SHOPEE_ACCESS_TOKEN!,
    env: (process.env.SHOPEE_ENV as "sandbox" | "production") ?? "sandbox",
  });
}
