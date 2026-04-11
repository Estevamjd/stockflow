// Tipos para a API Shopee Partner v2

export interface ShopeeOrderItem {
  item_id: number;
  item_sku: string;
  item_name: string;
  model_id: number;
  model_sku: string;
  model_name: string;
  model_quantity_purchased: number;
  model_original_price: number;
  model_discounted_price: number;
}

export interface ShopeeOrder {
  order_sn: string;
  order_status: string;
  create_time: number;
  update_time: number;
  buyer_user_id?: number;
  buyer_username?: string;
  recipient_address?: {
    name: string;
    phone: string;
    town: string;
    district: string;
    city: string;
    state: string;
    country: string;
    zipcode: string;
    full_address: string;
  };
  total_amount: number;
  currency: string;
  item_list: ShopeeOrderItem[];
  note?: string;
  payment_method?: string;
  fulfillment_flag?: string;
  shipping_carrier?: string;
}

export interface GetOrdersParams {
  time_range_field?: "create_time" | "update_time";
  time_from?: number;
  time_to?: number;
  page_size?: number;
  cursor?: string;
  order_status?: string;
}

export interface GetOrdersResponse {
  orders: ShopeeOrder[];
  next_cursor?: string;
  has_next_page: boolean;
  total?: number;
}

export interface WebhookPayload {
  code: number;
  timestamp: number;
  shop_id: number;
  data: {
    ordersn?: string;
    status?: string;
    item_list?: Array<{
      item_id: number;
      model_id: number;
      normal_stock: number;
    }>;
  };
  sync?: boolean;
}
