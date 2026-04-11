import { 
  User as PrismaUser, 
  Tenant as PrismaTenant, 
  Subscription as PrismaSubscription, 
  Product as PrismaProduct,
  Sale as PrismaSale,
  SaleItem as PrismaSaleItem,
  Category as PrismaCategory,
  ProductStatus,
  UserRole,
  SaleChannel,
  SaleStatus
} from "@prisma/client";

export type { UserRole, PlanName, SubscriptionStatus, ProductStatus, SaleChannel, SaleStatus } from "@prisma/client";

export interface User extends PrismaUser {
  tenant?: Tenant;
}

export interface Tenant extends PrismaTenant {
  subscription?: PrismaSubscription | null;
  _count?: {
    users: number;
    products: number;
    sales: number;
  };
}

export interface ProductWithCategory extends Omit<PrismaProduct, 'costPrice' | 'salePrice' | 'profitMargin'> {
  category?: Partial<PrismaCategory> | null;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  categoryId?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity?: number;
  minStockLevel?: number;
  unit?: string;
}

export interface CreateSaleInput {
  channel?: SaleChannel;
  externalOrderId?: string;
  customerName?: string;
  customerEmail?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount?: number;
  shippingCost?: number;
  notes?: string;
  saleDate?: Date;
  status?: SaleStatus;
}

export interface SaleWithItems extends Omit<PrismaSale, 'subtotal' | 'discount' | 'shippingCost' | 'totalAmount' | 'totalCost' | 'profit'> {
  items: Array<Omit<PrismaSaleItem, 'unitPrice' | 'unitCost' | 'totalPrice' | 'profit'> & { 
    product: { id: string; name: string; sku: string };
    unitPrice: number;
    unitCost: number;
    totalPrice: number;
    profit: number;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  role: string;
}

/**
 * Shape do `session.user` depois dos callbacks do NextAuth.
 * Exportado para os componentes/rotas que precisam refinar o tipo
 * sem repetir a interface.
 */
export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  tenantId: string;
  role: UserRole;
}

/**
 * Input para criar uma entrada de estoque.
 */
export interface StockEntryInput {
  productId: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  notes?: string;
  entryDate?: Date;
}

/**
 * Filtros aceitos pelo `ReportService.getSalesReport`.
 */
export interface SaleReportFilters {
  from?: string;
  to?: string;
  channel?: SaleChannel | string;
  status?: SaleStatus | string;
}

/**
 * Item retornado pelo `ReportService.getTopProducts`.
 */
export interface TopProduct {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
}
