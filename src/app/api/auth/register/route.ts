// Route de registro de usuário
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { slugify } from "@/lib/utils";
import { SubscriptionService } from "@/services/subscription.service";
import { passwordSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  // Rate limit: máximo 5 registros por IP por hora.
  const limited = applyRateLimit("register", req, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited as NextResponse;

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Resposta genérica que não vaza se o email já existe.
    // Evita enumeração de usuários: o atacante não consegue
    // distinguir "criou agora" de "já existia". O hash bcrypt
    // continua sendo computado no caminho duplicado para igualar
    // o tempo de resposta dos dois cenários.
    const GENERIC_OK = NextResponse.json(
      { success: true, data: null },
      { status: 201 }
    );

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Computa o hash mesmo que vá descartar — preserva o timing.
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      // Não cria nada, mas responde idêntico ao caminho de sucesso.
      return GENERIC_OK;
    }

    const tenantSlug = slugify(name) + "-" + Date.now().toString(36);

    // Criar tenant + usuário atomicamente
    const { tenant } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name, slug: tenantSlug },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          passwordHash,
          role: "OWNER",
        },
      });
      return { tenant };
    });

    await SubscriptionService.createFreeSubscription(tenant.id, email);

    return GENERIC_OK;
  } catch (err) {
    console.error("[Register API]:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
