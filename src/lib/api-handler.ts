import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { ZodError } from "zod";

type ApiHandler<T> = () => Promise<T>;

export async function withApiHandler<T>(handler: ApiHandler<T>) {
  try {
    const data = await handler();
    return NextResponse.json({
      success: true,
      data,
      error: null,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, data: null, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          data: null, 
          error: "Erro de validação de dados.", 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("🔥 API Error:", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: process.env.NODE_ENV === "production"
          ? "Ocorreu um erro interno no servidor."
          : message,
      },
      { status: 500 }
    );
  }
}
