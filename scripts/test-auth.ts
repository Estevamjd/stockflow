import { getServerSession } from "next-auth";
import { authOptions } from "../src/lib/auth";

async function test() {
  try {
    console.log("Testando getServerSession com authOptions...");
    // Simular uma requisição vazia ou mockada se necessário, 
    // mas aqui apenas chamamos para ver se explode na inicialização.
    console.log("Configurações carregadas:", Object.keys(authOptions));
  } catch (err: any) {
    console.error("Erro na inicialização do Auth:", err.message);
  }
}

test();
