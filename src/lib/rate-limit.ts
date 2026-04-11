/**
 * Rate limiter in-memory por (key, bucket).
 *
 * Implementação:
 *   - Sliding window com array de timestamps
 *   - Por instância de Node — NÃO sincroniza entre serverless replicas
 *   - Suficiente para defesa contra brute force casual
 *
 * Quando migrar para múltiplas réplicas (autoscale Vercel/k8s):
 *   substituir por @upstash/ratelimit + Redis sem mudar a interface.
 *
 * Uso:
 *   const result = rateLimit.check("login:" + ip, { limit: 5, windowMs: 5 * 60_000 });
 *   if (!result.allowed) return 429
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Limpa buckets vazios a cada 10min para não vazar memória.
// Em ambiente serverless o GC do processo já lida; isso é defesa extra.
const CLEANUP_INTERVAL_MS = 10 * 60_000;
let lastCleanup = Date.now();

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.length === 0) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
}

export const rateLimit = {
  check(key: string, opts: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    maybeCleanup(now);

    const cutoff = now - opts.windowMs;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { hits: [] };
      buckets.set(key, bucket);
    }

    // Remove hits fora da janela
    bucket.hits = bucket.hits.filter((t) => t > cutoff);

    const allowed = bucket.hits.length < opts.limit;
    if (allowed) {
      bucket.hits.push(now);
    }

    const oldest = bucket.hits[0] ?? now;
    const resetMs = Math.max(0, opts.windowMs - (now - oldest));

    return {
      allowed,
      remaining: Math.max(0, opts.limit - bucket.hits.length),
      resetMs,
      limit: opts.limit,
    };
  },

  /**
   * Reset manual de uma chave (uso em testes ou após login bem-sucedido).
   */
  reset(key: string): void {
    buckets.delete(key);
  },
};

/**
 * Extrai o IP do cliente de uma Request, considerando proxies.
 * Vercel manda em x-forwarded-for; em dev local cai em 'unknown'.
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Helper de uso comum em rotas: aplica o rate limit e retorna a resposta
 * 429 já formatada em caso de bloqueio. Use:
 *
 *   const blocked = applyRateLimit("register", req, { limit: 3, windowMs: 60_000 });
 *   if (blocked) return blocked;
 */
export function applyRateLimit(
  bucket: string,
  req: Request,
  opts: RateLimitOptions
): Response | null {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const result = rateLimit.check(key, opts);
  if (result.allowed) return null;

  return new Response(
    JSON.stringify({
      success: false,
      error: "Muitas tentativas. Tente novamente em alguns minutos.",
      code: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
        "Retry-After": String(Math.ceil(result.resetMs / 1000)),
      },
    }
  );
}
