import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function check() {
  console.log("🔍 Buscando usuário demo@stockflow.com...");
  const user = await prisma.user.findUnique({
    where: { email: "demo@stockflow.com" }
  });

  if (!user) {
    console.log("❌ USUÁRIO NÃO ENCONTRADO!");
  } else {
    console.log("✅ USUÁRIO ENCONTRADO:", user.email);
    console.log("Hash atual no banco:", user.passwordHash);
    
    const isValid = await bcrypt.compare("demo123456", user.passwordHash!);
    console.log("Senha 'demo123456' é válida?", isValid);

    if (!isValid) {
      console.log("⚠️ Senha inválida! Forçando redefinição para 'demo123456'...");
      const newHash = await bcrypt.hash("demo123456", 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash }
      });
      console.log("🚀 Senha redefinida com sucesso!");
    }
  }
  await prisma.$disconnect();
}

check().catch(console.error);
