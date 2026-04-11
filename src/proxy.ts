import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Middleware global do StockFlow.
 *
 * Responsabilidades:
 *  1. Bloquear /api/mock/* em produção (defesa em camadas — as rotas
 *     também checam process.env.NODE_ENV inline, mas confiar só naquilo
 *     é frágil).
 *  2. Bloquear /admin e /api/admin para qualquer um que não seja
 *     SUPERADMIN. OWNER é dono do TENANT, não do SaaS — não pode entrar
 *     no painel global.
 *  3. Garantir que toda rota autenticada tem `tenantId` no token (sem
 *     isso, queries do tenant vão quebrar de forma confusa).
 *  4. Injetar headers `x-tenant-id`, `x-user-id`, `x-user-role` para
 *     uso opcional em loggers/metrics.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Bloqueia /api/mock/* em produção (camada 1 de defesa)
    if (pathname.startsWith("/api/mock") && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Disponível apenas em desenvolvimento" },
        { status: 404 }
      );
    }

    // Injeta headers de contexto para downstream (logger/metrics)
    const requestHeaders = new Headers(req.headers);
    if (token) {
      requestHeaders.set("x-tenant-id", (token.tenantId as string) ?? "");
      requestHeaders.set("x-user-id", (token.id as string) ?? "");
      requestHeaders.set("x-user-role", (token.role as string) ?? "");
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // ─── Rotas públicas ───────────────────────────────────────
        // Não exigem token nenhum.
        const publicPrefixes = [
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/api/auth",     // NextAuth handlers (signin/signout/csrf/...)
          "/api/webhooks", // Webhooks externos (Stripe, Shopee, MP)
          "/pricing",
        ];
        const isPublic =
          pathname === "/" ||
          publicPrefixes.some((p) => pathname.startsWith(p));
        if (isPublic) return true;

        // ─── Cron público (autenticado por Bearer dentro da rota) ─
        // O middleware NÃO valida o secret aqui porque confiar em
        // header customizado dentro de withAuth complica testes; cada
        // rota /api/cron/* exige `Authorization: Bearer ${CRON_SECRET}`.
        if (pathname.startsWith("/api/cron")) return true;

        // ─── Daqui pra baixo exige token ──────────────────────────
        if (!token) return false;

        // ─── Painel SuperAdmin (escopo SaaS, não tenant) ──────────
        // SOMENTE SUPERADMIN. OWNER é dono de TENANT, não do SaaS.
        // Bug histórico: o gating antigo aceitava OWNER → IDOR cross-tenant.
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
          return token.role === "SUPERADMIN";
        }

        // ─── Multi-tenant: token sem tenantId é sessão corrompida ─
        if (!token.tenantId) return false;

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Roda em todo path EXCETO assets estáticos.
     * Importante: NÃO excluir /api/* — webhooks externos precisam passar
     * pelo middleware (ele os libera via `publicPrefixes`).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
