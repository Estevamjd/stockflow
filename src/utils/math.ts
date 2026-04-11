/**
 * Calcula a porcentagem de forma segura, evitando divisão por zero.
 * @param value Valor atual
 * @param total Valor total (denominador)
 * @returns Porcentagem formatada com as casas decimais solicitadas ou 0 se total for 0.
 */
export function safePercentage(value: number, total: number, decimals = 1): number {
  if (!total || total === 0) return 0;
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Retorna um fallback se o valor for nulo ou indefinido.
 */
export function withFallback<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}
