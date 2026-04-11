import type { IShopeeClient } from "./client.interface";
import type {
  GetOrdersParams,
  GetOrdersResponse,
  ShopeeOrder,
  ShopeeOrderItem,
  WebhookPayload,
} from "./types";

// 7 produtos de festa pré-cadastrados no mock
const MOCK_PRODUCTS = [
  { sku: "TUB-30CM-ROSA", name: "Tubete 30cm Rosa", price: 3.5 },
  { sku: "TUB-30CM-AZUL", name: "Tubete 30cm Azul", price: 3.5 },
  { sku: "TUB-13CM-MIX", name: "Tubete 13cm Mix de Cores", price: 2.0 },
  { sku: "CX-CORACAO-BCO", name: "Caixinha Coração Branca", price: 4.0 },
  { sku: "CX-CUBO-KFT", name: "Caixinha Cubo Kraft", price: 3.0 },
  { sku: "TAG-REDONDA-12", name: "Tag Redonda 12un", price: 5.5 },
  { sku: "KIT-FESTA-30", name: "Kit Festa Completo 30un", price: 45.0 },
];

// Banco em memória por tenant
const ordersByTenant = new Map<string, Map<string, ShopeeOrder>>();

function getOrderStore(tenantId: string): Map<string, ShopeeOrder> {
  if (!ordersByTenant.has(tenantId)) {
    ordersByTenant.set(tenantId, new Map());
  }
  return ordersByTenant.get(tenantId)!;
}

function generateOrderId(): string {
  return `MOCK${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function generateMockOrder(tenantId: string): ShopeeOrder {
  const store = getOrderStore(tenantId);
  const orderId = generateOrderId();

  // 1–3 produtos aleatórios
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const selectedProducts = [...MOCK_PRODUCTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, itemCount);

  const items: ShopeeOrderItem[] = selectedProducts.map((p, idx) => ({
    item_id: idx + 1001,
    item_sku: p.sku,
    item_name: p.name,
    model_id: idx + 2001,
    model_sku: p.sku,
    model_name: p.name,
    model_quantity_purchased: Math.floor(Math.random() * 3) + 1,
    model_original_price: p.price,
    model_discounted_price: p.price,
  }));

  const totalAmount = items.reduce(
    (sum, i) => sum + i.model_discounted_price * i.model_quantity_purchased,
    0
  );

  const mockNames = ["Ana Silva", "João Santos", "Maria Oliveira", "Pedro Costa", "Carla Souza"];
  const buyerName = mockNames[Math.floor(Math.random() * mockNames.length)];

  const order: ShopeeOrder = {
    order_sn: orderId,
    order_status: "READY_TO_SHIP",
    create_time: Date.now() / 1000,
    update_time: Date.now() / 1000,
    buyer_username: buyerName.toLowerCase().replace(" ", "_"),
    recipient_address: {
      name: buyerName,
      phone: "11999887766",
      town: "Centro",
      district: "São Paulo",
      city: "São Paulo",
      state: "SP",
      country: "BR",
      zipcode: "01310-100",
      full_address: `Av. Paulista, ${Math.floor(Math.random() * 2000) + 1}, SP`,
    },
    total_amount: totalAmount,
    currency: "BRL",
    item_list: items,
    payment_method: "CREDIT_CARD",
    fulfillment_flag: "fulfilled_by_seller",
  };

  store.set(orderId, order);
  return order;
}

export class MockShopeeClient implements IShopeeClient {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async getOrders(params?: GetOrdersParams): Promise<GetOrdersResponse> {
    const store = getOrderStore(this.tenantId);
    const orders = Array.from(store.values());

    const statusFilter = params?.order_status;
    const filtered = statusFilter
      ? orders.filter((o) => o.order_status === statusFilter)
      : orders;

    return {
      orders: filtered,
      has_next_page: false,
      total: filtered.length,
    };
  }

  async getOrderDetail(orderId: string): Promise<ShopeeOrder> {
    const store = getOrderStore(this.tenantId);
    const order = store.get(orderId);
    if (!order) throw new Error(`Pedido mock não encontrado: ${orderId}`);
    return order;
  }

  async updateStock(sku: string, quantity: number): Promise<boolean> {
    console.log(`[MockShopee] updateStock: SKU=${sku}, qty=${quantity}`);
    return true;
  }

  // Expõe geração de pedido e simulação de webhook
  generateOrder(): ShopeeOrder {
    return generateMockOrder(this.tenantId);
  }

  simulateWebhook(order: ShopeeOrder): WebhookPayload {
    return {
      code: 3, // ORDER_STATUS_UPDATE
      timestamp: Date.now() / 1000,
      shop_id: 12345,
      data: {
        ordersn: order.order_sn,
        status: order.order_status,
      },
      sync: true,
    };
  }

  static getMockProducts() {
    return MOCK_PRODUCTS;
  }
}
