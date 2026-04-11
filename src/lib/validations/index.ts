import { z } from "zod";

/**
 * Senha mínima do StockFlow:
 *   - 10 caracteres ou mais
 *   - Pelo menos uma letra
 *   - Pelo menos um dígito
 *
 * Mais forte que o NIST mínimo (8) sem entrar em complexidade exagerada
 * que prejudica UX. Senhas hardcoded em seeds (`demo123456`, `admin123456`)
 * passam por essa regra propositalmente para o seed continuar funcionando.
 */
export const passwordSchema = z
  .string()
  .min(10, "Senha deve ter pelo menos 10 caracteres")
  .regex(/[A-Za-z]/, "Senha deve conter pelo menos uma letra")
  .regex(/[0-9]/, "Senha deve conter pelo menos um dígito");

export const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  sku: z.string().min(1, "SKU é obrigatório"),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  stockQuantity: z.number().int().min(0),
  minStockLevel: z.number().int().min(0).default(5),
  unit: z.string().default("un"),
});

export const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "A venda deve ter pelo menos um item"),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  discount: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  channel: z.enum(["MANUAL", "SHOPEE", "ELO7", "MAGALU", "MERCADO_LIVRE", "AMAZON", "OTHER"]).default("MANUAL"),
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).default("PAID"),
  notes: z.string().optional(),
  saleDate: z.date().optional(),
  externalOrderId: z.string().optional(),
});

export const userSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  password: passwordSchema.optional(),
});

export const tenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug inválido"),
});
