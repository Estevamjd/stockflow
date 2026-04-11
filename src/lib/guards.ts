import { type Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { AppError, ErrorCodes } from "./errors";
import { logger } from "./logger";
import { ZodError } from "zod";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPERADMIN: 5,
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function requireAuth(session: Session | null): asserts session is Session {
  if (!session || !session.user) {
    throw new AppError("Não autenticado", 401, ErrorCodes.UNAUTHORIZED);
  }
}

export function requireRole(session: Session | null, minRole: UserRole): void {
  requireAuth(session);
  const userRole = (session.user as { role?: UserRole }).role ?? "VIEWER";
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
    throw new AppError("Sem permissão para esta ação", 403, ErrorCodes.FORBIDDEN);
  }
}

/**
 * Matriz de permissões resource × action × role.
 *
 * Convenções:
 *  - VIEWER: leitura geral. Não cria, não edita, não deleta.
 *  - MEMBER: leitura + criação/edição de produto/venda/estoque (operacional do dia).
 *  - ADMIN:  tudo de MEMBER + delete + alterar settings + alterar plano.
 *  - OWNER:  tudo de ADMIN + ações de tenant (delete tenant, transferir).
 *  - SUPERADMIN: roda em escopo SaaS, separado (gateado pelo proxy.ts).
 *
 * Adicionar uma nova permissão = adicionar entrada aqui. Não duplicar
 * lista de roles em lugar nenhum.
 */
const PERMISSIONS: Record<string, Record<string, UserRole[]>> = {
  product: {
    read: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
    create: ["MEMBER", "ADMIN", "OWNER"],
    update: ["MEMBER", "ADMIN", "OWNER"],
    delete: ["ADMIN", "OWNER"],
  },
  category: {
    read: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
    create: ["MEMBER", "ADMIN", "OWNER"],
    update: ["MEMBER", "ADMIN", "OWNER"],
    delete: ["ADMIN", "OWNER"],
  },
  sale: {
    read: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
    create: ["MEMBER", "ADMIN", "OWNER"],
    update: ["ADMIN", "OWNER"],
    delete: ["OWNER"],
  },
  inventory: {
    read: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
    create: ["MEMBER", "ADMIN", "OWNER"],
    update: ["ADMIN", "OWNER"],
    delete: ["OWNER"],
  },
  notification: {
    read: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
    update: ["VIEWER", "MEMBER", "ADMIN", "OWNER"], // marcar como lida
  },
  report: {
    read: ["MEMBER", "ADMIN", "OWNER"],
  },
  settings: {
    read: ["ADMIN", "OWNER"],
    update: ["OWNER"],
  },
  subscription: {
    read: ["MEMBER", "ADMIN", "OWNER"],
    update: ["ADMIN", "OWNER"], // checkout, mudar plano
  },
  plan: {
    read: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
  },
};

export function canAccessResource(
  session: Session | null,
  resource: { resource: string; action: string }
): boolean {
  if (!session?.user) return false;
  const role = (session.user as { role?: UserRole }).role ?? "VIEWER";

  // SUPERADMIN passa em qualquer permission de tenant (mas gateado em
  // outras camadas para não acessar tenants alheios sem propósito).
  if (role === "SUPERADMIN") return true;

  const resourcePerms = PERMISSIONS[resource.resource];
  if (!resourcePerms) return false;
  const actionPerms = resourcePerms[resource.action];
  if (!actionPerms) return false;
  return actionPerms.includes(role);
}

/**
 * Versão "throwable" de canAccessResource — para uso direto em handlers
 * de API. Lança AppError 401/403 que o handleApiError mapeia.
 */
export function requireCan(
  session: Session | null,
  resource: string,
  action: string
): void {
  requireAuth(session);
  if (!canAccessResource(session, { resource, action })) {
    throw new AppError(
      `Sem permissão para ${action} em ${resource}`,
      403,
      ErrorCodes.FORBIDDEN
    );
  }
}

export function handleApiError(error: unknown): { status: number; message: string; code: string } {
  if (error instanceof ZodError) {
    logger.warn({ err: error, type: "Validation" }, "Erro de validação de payload");
    const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return { status: 400, message, code: ErrorCodes.VALIDATION_ERROR };
  }

  if (error instanceof AppError) {
    const level = error.statusCode >= 500 ? "error" : "warn";
    logger[level]({ err: error, code: error.code }, "Erro operacional gerado pela aplicação");
    return { status: error.statusCode, message: error.message, code: error.code };
  }

  // Fallback for generic errors
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return { status: 401, message: "Não autenticado", code: ErrorCodes.UNAUTHORIZED };
    if (error.message === "FORBIDDEN") return { status: 403, message: "Sem permissão para esta ação", code: ErrorCodes.FORBIDDEN };
  }

  logger.error({ err: error }, "Erro interno não tratado");
  return { status: 500, message: "Erro interno do servidor", code: ErrorCodes.INTERNAL_ERROR };
}
