import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@stockflow.com";
  // Em algumas versões do app, a senha usa genSalt/hash do bcrypt
  const passwordHash = hashSync("admin123456", 12);

  let adminTenant = await prisma.tenant.findFirst({ where: { slug: "admin" } });
  if (!adminTenant) {
    adminTenant = await prisma.tenant.create({
      data: { name: "Admin Tenant", slug: "admin", plan: "enterprise" }
    });
  }

  let adminUser = await prisma.user.findUnique({ where: { email } });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        tenantId: adminTenant.id,
        email,
        name: "Admin StockFlow",
        passwordHash,
        role: "SUPERADMIN",
      },
    });
    console.log(`Admin criado:\nemail: ${email}\nsenha: admin123456`);
  } else {
    await prisma.user.update({
      where: { email },
      data: { role: "SUPERADMIN", passwordHash }
    });
    console.log(`Admin atualizado:\nemail: ${email}\nsenha: admin123456`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
