/**
 * Logger leve com interface compatível com Pino.
 *
 * Assinaturas suportadas:
 *   logger.info("mensagem")
 *   logger.info({ tenantId, op: "x" }, "mensagem")
 *
 * Em desenvolvimento usa cores ANSI; em produção emite JSON estruturado
 * para ser indexado por Vercel Logs / Axiom / Datadog.
 *
 * Redação: qualquer campo cujo nome esteja em REDACT_KEYS é substituído
 * por "[REDACTED]" recursivamente antes da serialização. Isso protege
 * payloads de webhooks de Stripe/MercadoPago/Shopee que contém dados
 * sensíveis, e também cookies/tokens em logs de erro.
 *
 * Não usar `pino` real ainda para evitar deps pesadas em build edge.
 * Quando crescer, trocar essa implementação por `pino` real (mesma API).
 */
type LogLevel = "info" | "warn" | "error" | "debug";

type Loggable = Record<string, unknown> | Error | unknown;

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[34m",
};
const RESET = "\x1b[0m";

const REDACT_KEYS = new Set([
  // Credenciais básicas
  "password",
  "passwordhash",
  "password_hash",
  "newpassword",
  "new_password",
  "currentpassword",
  "current_password",
  // Tokens e secrets
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "idtoken",
  "id_token",
  "sessiontoken",
  "session_token",
  "session_state",
  "secret",
  "clientsecret",
  "client_secret",
  "apikey",
  "api_key",
  "webhooksecret",
  "webhook_secret",
  // HTTP sensível
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  // Pagamentos
  "cvv",
  "cardnumber",
  "card_number",
  "stripesignature",
  "stripe_signature",
  "stripe-signature",
  // Chaves privadas
  "privatekey",
  "private_key",
]);
const REDACT_MASK = "[REDACTED]";
const REDACT_MAX_DEPTH = 6;

class Logger {
  private isProduction = process.env.NODE_ENV === "production";

  // ─── Overloads ───
  info(msg: string): void;
  info(obj: Loggable, msg: string): void;
  info(...args: unknown[]): void {
    this.write("info", args);
  }

  warn(msg: string): void;
  warn(obj: Loggable, msg: string): void;
  warn(...args: unknown[]): void {
    this.write("warn", args);
  }

  error(msg: string): void;
  error(obj: Loggable, msg: string): void;
  error(...args: unknown[]): void {
    this.write("error", args);
  }

  debug(msg: string): void;
  debug(obj: Loggable, msg: string): void;
  debug(...args: unknown[]): void {
    if (this.isProduction) return;
    this.write("debug", args);
  }

  // ─── Implementação ───
  private write(level: LogLevel, args: unknown[]) {
    const { msg, data } = this.parseArgs(args);
    const timestamp = new Date().toISOString();

    const redacted = data ? (this.redact(data) as Record<string, unknown>) : undefined;

    const payload = {
      timestamp,
      level,
      msg,
      env: process.env.NODE_ENV,
      ...(redacted ? { ...redacted } : {}),
    };

    if (this.isProduction) {
      // JSON estruturado: 1 linha por log → fácil para o Vercel/Axiom indexar
      console.log(JSON.stringify(payload, this.errorReplacer));
    } else {
      const color = COLORS[level];
      console.log(
        `${color}[${level.toUpperCase()}]${RESET} ${timestamp} ${msg}`,
        redacted && Object.keys(redacted).length > 0 ? redacted : ""
      );
    }
  }

  /**
   * Redação recursiva: substitui valores de chaves sensíveis por [REDACTED].
   * Usa um Set com case-insensitive matching. Limita profundidade para
   * evitar stack overflow em objetos circulares (também usa WeakSet).
   */
  private redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
    if (value == null || depth > REDACT_MAX_DEPTH) return value;
    if (typeof value !== "object") return value;
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((v) => this.redact(v, depth + 1, seen));
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.has(k.toLowerCase())) {
        out[k] = REDACT_MASK;
      } else {
        out[k] = this.redact(v, depth + 1, seen);
      }
    }
    return out;
  }

  /**
   * Aceita as duas formas:
   *  - (msg)
   *  - (obj, msg)
   * Retorna sempre `{ msg, data }`.
   */
  private parseArgs(args: unknown[]): { msg: string; data?: Record<string, unknown> } {
    if (args.length === 0) return { msg: "" };

    if (args.length === 1) {
      const first = args[0];
      if (typeof first === "string") return { msg: first };
      // Pino aceita só um objeto também
      return { msg: "", data: this.normalize(first) };
    }

    // (obj, msg)
    const [first, second] = args;
    if (typeof second === "string") {
      return {
        msg: second,
        data: this.normalize(first),
      };
    }
    // fallback: primeiro como msg, segundo como data (compat antigo)
    return {
      msg: typeof first === "string" ? first : String(first),
      data: this.normalize(second),
    };
  }

  private normalize(value: unknown): Record<string, unknown> | undefined {
    if (value == null) return undefined;
    if (value instanceof Error) {
      return { err: { name: value.name, message: value.message, stack: value.stack } };
    }
    if (typeof value === "object") {
      // Garante shape Record para o spread
      return value as Record<string, unknown>;
    }
    return { value };
  }

  /**
   * JSON.stringify replacer que serializa Errors corretamente.
   */
  private errorReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
  }
}

export const logger = new Logger();
