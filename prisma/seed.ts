import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco...");

  // Limpar dados existentes (na ordem correta para evitar FK violations)
  await prisma.activityLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stockExit.deleteMany();
  await prisma.stockEntry.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.planLimitHit.deleteMany();
  await prisma.tenant.deleteMany();

  // ─── 1. Tenant Demo ───────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      name: "Loja Demo",
      slug: "loja-demo",
      plan: "free",
    },
  });
  console.log(`✅ Tenant criado: ${tenant.name}`);

  // ─── 2. Usuário OWNER ─────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo123456", 12);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Admin Demo",
      email: "demo@stockflow.com",
      passwordHash,
      role: "OWNER",
    },
  });
  console.log(`✅ Usuário criado: ${user.email}`);

  // ─── 3. Categorias ────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({ data: { tenantId: tenant.id, name: "Tubetes", color: "#6366f1" } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Caixinhas", color: "#f59e0b" } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Tags", color: "#22c55e" } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Kits", color: "#ef4444" } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Outros", color: "#8b5cf6" } }),
  ]);
  console.log(`✅ ${categories.length} categorias criadas`);

  const [catTubetes, catCaixinhas, catTags, catKits] = categories;

  // ─── 4. Produtos (10 itens de festa) ──────────────────────
  const products = await Promise.all([
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catTubetes.id, name: "Tubete 30cm Rosa Perolado", sku: "TUB-30-ROSA", costPrice: 1.80, salePrice: 3.50, profitMargin: 48.57, stockQuantity: 120, minStockLevel: 20, unit: "un" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catTubetes.id, name: "Tubete 30cm Azul Royal", sku: "TUB-30-AZUL", costPrice: 1.80, salePrice: 3.50, profitMargin: 48.57, stockQuantity: 85, minStockLevel: 20, unit: "un" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catTubetes.id, name: "Tubete 13cm Mix de Cores", sku: "TUB-13-MIX", costPrice: 0.90, salePrice: 2.00, profitMargin: 55.00, stockQuantity: 3, minStockLevel: 30, unit: "un" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catCaixinhas.id, name: "Caixinha Coração Branca P4", sku: "CX-COR-P4-BCO", costPrice: 1.50, salePrice: 4.00, profitMargin: 62.50, stockQuantity: 60, minStockLevel: 15, unit: "un" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catCaixinhas.id, name: "Caixinha Cubo Kraft Natural", sku: "CX-CUBO-KFT", costPrice: 1.20, salePrice: 3.00, profitMargin: 60.00, stockQuantity: 0, minStockLevel: 10, unit: "un" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catCaixinhas.id, name: "Caixinha Malinha Rosa Gold", sku: "CX-MAL-ROSA", costPrice: 2.00, salePrice: 5.50, profitMargin: 63.64, stockQuantity: 45, minStockLevel: 10, unit: "un" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catTags.id, name: "Tag Circular Arte Festa 12un", sku: "TAG-CIRC-12", costPrice: 2.50, salePrice: 5.50, profitMargin: 54.55, stockQuantity: 28, minStockLevel: 15, unit: "pacote" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catTags.id, name: "Tag Borboleta com Furo 20un", sku: "TAG-BORB-20", costPrice: 3.00, salePrice: 7.00, profitMargin: 57.14, stockQuantity: 40, minStockLevel: 10, unit: "pacote" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catKits.id, name: "Kit Lembrancinhas Festa 30 peças", sku: "KIT-FESTA-30", costPrice: 18.00, salePrice: 45.00, profitMargin: 60.00, stockQuantity: 15, minStockLevel: 5, unit: "kit" } }),
    prisma.product.create({ data: { tenantId: tenant.id, categoryId: catKits.id, name: "Kit Tubetes + Tags 50un", sku: "KIT-TUB-TAG-50", costPrice: 22.00, salePrice: 55.00, profitMargin: 60.00, stockQuantity: 8, minStockLevel: 5, unit: "kit" } }),
  ]);
  console.log(`✅ ${products.length} produtos criados`);

  // ─── 5. Entradas de Estoque (históricas) ──────────────────
  const [prod1, prod2, prod4] = products;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.stockEntry.create({
      data: {
        tenantId: tenant.id, productId: prod1.id, userId: user.id,
        quantity: 100, unitCost: 1.80, totalCost: 180, averageCostAfter: 1.80,
        supplier: "Fornecedora ABC", entryDate: thirtyDaysAgo,
      },
    }),
    prisma.stockEntry.create({
      data: {
        tenantId: tenant.id, productId: prod2.id, userId: user.id,
        quantity: 80, unitCost: 1.80, totalCost: 144, averageCostAfter: 1.80,
        supplier: "Fornecedora ABC", entryDate: fifteenDaysAgo,
      },
    }),
    prisma.stockEntry.create({
      data: {
        tenantId: tenant.id, productId: prod4.id, userId: user.id,
        quantity: 50, unitCost: 1.50, totalCost: 75, averageCostAfter: 1.50,
        supplier: "Ateliê Criativo", entryDate: new Date(),
      },
    }),
  ]);
  console.log("✅ 3 entradas de estoque criadas");

  // ─── 6. Vendas simuladas ──────────────────────────────────
  const salesData = [
    {
      channel: "SHOPEE" as const,
      externalOrderId: "SHOP2024001",
      customerName: "Ana Paula Ferreira",
      items: [{ product: prod1, qty: 5 }, { product: prod4, qty: 3 }],
      daysAgo: 25,
    },
    {
      channel: "MANUAL" as const,
      customerName: "Carlos Eduardo Lima",
      items: [{ product: prod2, qty: 10 }],
      daysAgo: 18,
    },
    {
      channel: "SHOPEE" as const,
      externalOrderId: "SHOP2024002",
      customerName: "Beatriz Souza",
      items: [{ product: products[8], qty: 1 }, { product: products[6], qty: 2 }],
      daysAgo: 10,
    },
    {
      channel: "MANUAL" as const,
      customerName: "Roberto Dias",
      items: [{ product: products[5], qty: 8 }, { product: products[7], qty: 4 }],
      daysAgo: 5,
    },
    {
      channel: "SHOPEE" as const,
      externalOrderId: "SHOP2024003",
      customerName: "Juliana Costa",
      items: [{ product: products[9], qty: 1 }],
      daysAgo: 1,
    },
  ];

  for (const saleData of salesData) {
    const saleDate = new Date(Date.now() - saleData.daysAgo * 24 * 60 * 60 * 1000);
    let subtotal = 0;
    const itemsToCreate = [];

    for (const { product, qty } of saleData.items) {
      const totalPrice = Number(product.salePrice) * qty;
      const unitCost = Number(product.costPrice);
      subtotal += totalPrice;
      itemsToCreate.push({
        productId: product.id,
        quantity: qty,
        unitPrice: Number(product.salePrice),
        unitCost,
        totalPrice,
        profit: totalPrice - unitCost * qty,
      });
    }

    const totalCost = itemsToCreate.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
    const sale = await prisma.sale.create({
      data: {
        tenantId: tenant.id, userId: user.id,
        channel: saleData.channel,
        externalOrderId: saleData.externalOrderId,
        customerName: saleData.customerName,
        subtotal, discount: 0, shippingCost: 0,
        totalAmount: subtotal, totalCost,
        profit: subtotal - totalCost,
        status: "DELIVERED",
        saleDate,
        items: { create: itemsToCreate },
      },
    });

    // Criar saídas de estoque
    for (const { product, qty } of saleData.items) {
      await prisma.stockExit.create({
        data: {
          tenantId: tenant.id, productId: product.id,
          quantity: qty, costAtExit: product.costPrice,
          reason: "SALE", referenceId: sale.id, exitDate: saleDate,
        },
      });
    }
  }
  console.log(`✅ ${salesData.length} vendas criadas`);

  // ─── 7. Notificações de estoque baixo ─────────────────────
  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "LOW_STOCK",
        title: "Estoque baixo",
        message: `Tubete 13cm Mix de Cores está com apenas 3 unidades (mínimo: 30).`,
        link: `/products/${products[2].id}`,
        metadata: { productId: products[2].id },
      },
      {
        tenantId: tenant.id,
        type: "OUT_OF_STOCK",
        title: "Produto sem estoque",
        message: `Caixinha Cubo Kraft Natural está sem estoque.`,
        link: `/products/${products[4].id}`,
        metadata: { productId: products[4].id },
      },
    ],
  });
  console.log("✅ 2 notificações de estoque criadas");

  // ─── 8. Config de integração mock ─────────────────────────
  await prisma.integrationConfig.create({
    data: {
      tenantId: tenant.id,
      type: "SHOPEE",
      encryptedCredentials: "{}",
      isActive: true,
      isMockMode: true,
    },
  });

  console.log("🎉 Seed concluído com sucesso!");
  console.log("─────────────────────────────");
  console.log("📧 Login: demo@stockflow.com");
  console.log("🔑 Senha: demo123456");
  console.log("─────────────────────────────");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
