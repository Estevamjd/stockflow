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

export function canAccessResource(
  session: Session | null,
  resource: { resource: string; action: string }
): boolean {
  if (!session?.user) return false;
  const role = (session.user as { role?: UserRole }).role ?? "VIEWER";

  const permissions: Record<string, Record<string, UserRole[]>> = {
    product: {
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
    report: {
      read: ["MEMBER", "ADMIN", "OWNER"],
    },
    settings: {
      read: ["ADMIN", "OWNER"],
      update: ["OWNER"],
    },
  };

  const resourcePerms = permissions[resource.resource];
  if (!resourcePerms) return false;
  const actionPerms = resourcePerms[resource.action];
  if (!actionPerms) return false;
  return actionPerms.includes(role);
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
