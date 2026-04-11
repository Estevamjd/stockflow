import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Tentando buscar assinaturas...");
    const subs = await prisma.subscription.findMany();
    console.log("Assinaturas encontradas:", subs.length);
  } catch (err: any) {
    console.error("Erro capturado:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
