import type {
  GetOrdersParams,
  GetOrdersResponse,
  ShopeeOrder,
} from "./types";

export interface IShopeeClient {
  getOrders(params?: GetOrdersParams): Promise<GetOrdersResponse>;
  getOrderDetail(orderId: string): Promise<ShopeeOrder>;
  updateStock(sku: string, quantity: number): Promise<boolean>;
}
