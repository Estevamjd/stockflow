/**
 * Script de manutenção: garante que `demo@stockflow.com` existe e tem
 * senha `demo123456`. Não apaga nenhum outro dado.
 *
 * Uso:
 *   npm run db:reset-demo
 *
 * Útil quando o banco está populado mas você não consegue logar (hash
 * antigo, senha esquecida, etc).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "demo@stockflow.com";
const PASSWORD = "demo123456";

async function main() {
  console.log(`🔧 Resetando senha de ${EMAIL}...`);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  let user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { tenant: true },
  });

  if (!user) {
    // Cria tenant + user de zero
    console.log("👤 Usuário não existe — criando do zero...");

    let tenant = await prisma.tenant.findFirst({ where: { slug: "loja-demo" } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: "Loja Demo", slug: "loja-demo", plan: "free" },
      });
      console.log(`✅ Tenant criado: ${tenant.name} (${tenant.id})`);
    }

    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Admin Demo",
        email: EMAIL,
        passwordHash,
        role: "OWNER",
        isActive: true,
      },
      include: { tenant: true },
    });
    console.log(`✅ Usuário criado: ${user.email}`);
  } else {
    // Atualiza só a senha + reativa se estiver desativado
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true },
    });
    console.log(`✅ Senha atualizada para usuário existente: ${user.email}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Pronto. Use estas credenciais para logar:");
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Senha: ${PASSWORD}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
