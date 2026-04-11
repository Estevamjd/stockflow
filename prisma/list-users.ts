import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listUsers() {
  console.log("👥 LISTA DE USUÁRIOS NO BANCO:");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      isActive: true,
      createdAt: true
    }
  });
  console.table(users);
  await prisma.$disconnect();
}

listUsers().catch(console.error);
