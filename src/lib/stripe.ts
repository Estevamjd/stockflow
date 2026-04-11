import Stripe from "stripe";

/**
 * Cliente Stripe lazy-singleton.
 *
 * Por que lazy: o Stripe SDK v21+ valida o `apiKey` no momento da
 * instanciação. Se exportarmos `new Stripe("")` no topo do módulo,
 * o `next build` quebra na fase "Collecting page data" porque o Next
 * avalia os módulos das rotas para gerar os tipos da API.
 *
 * Com lazy, o erro só acontece quando alguém realmente tenta usar o
 * Stripe sem ter configurado a chave — que é o comportamento desejado.
 *
 * Uso:
 *   import { stripe } from "@/lib/stripe";
 *   await stripe().subscriptions.retrieve(id);
 */
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurado. Defina a env var antes de chamar o Stripe."
    );
  }

  _stripe = new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
  return _stripe;
}

/**
 * Proxy que delega tudo para a instância lazy.
 * Permite escrever `stripe.subscriptions.retrieve(...)` em vez de
 * `getStripe().subscriptions.retrieve(...)`, mantendo backward compat
 * com o resto do código que importa `{ stripe }`.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
