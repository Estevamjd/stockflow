export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, public readonly code = ErrorCodes.INTERNAL_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export enum ErrorCodes {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT",
  PLAN_LIMIT_REACHED = "PLAN_LIMIT_REACHED",
  PLAN_LIMIT_PRODUCTS = "PLAN_LIMIT_PRODUCTS",
  PLAN_LIMIT_USERS = "PLAN_LIMIT_USERS",
  PLAN_LIMIT_SALES = "PLAN_LIMIT_SALES",
  PLAN_LIMIT_INTEGRATIONS = "PLAN_LIMIT_INTEGRATIONS",
  PLAN_FEATURE_UNAVAILABLE = "PLAN_FEATURE_UNAVAILABLE",
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }

  console.error("💥 Unhandled Error:", error);
  return { message: "Erro interno do servidor", statusCode: 500 };
};
