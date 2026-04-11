import { ExternalSubscription, IBillingProvider, BillingWebhookEvent } from "./billing.interface";
import { PlanName } from "../plans/plan-limits";

/**
 * Provider Stripe — IMPLEMENTAÇÃO PLANEJADA PARA A FASE 3.
 *
 * Hoje é apenas um stub que satisfaz a interface IBillingProvider para
 * que o BillingFactory funcione. Toda chamada lança erro explícito.
 *
 * Quando implementar: usar `@/lib/stripe` (cliente lazy) e mover a
 * lógica do `app/api/webhooks/stripe/route.ts` para cá.
 *
 * Args com prefixo `_` são intencionalmente ignorados até a implementação.
 */
export class StripeBillingProvider implements IBillingProvider {
  provider = 'stripe' as const;

  async createCustomer(_tenantId: string, _email: string, _name: string): Promise<string> {
    throw new Error("Stripe integration not implemented fully yet.");
  }

  async createSubscription(_customerId: string, _planName: PlanName): Promise<ExternalSubscription> {
    throw new Error("Stripe integration not implemented fully yet.");
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    throw new Error("Stripe integration not implemented fully yet.");
  }

  async createCheckoutSession(
    _customerId: string,
    _planName: PlanName,
    _successUrl: string,
    _cancelUrl: string
  ): Promise<string> {
    throw new Error("Stripe integration not implemented fully yet.");
  }

  async getPortalUrl(_customerId: string, _returnUrl: string): Promise<string> {
    throw new Error("Stripe integration not implemented fully yet.");
  }

  validateWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    throw new Error("Stripe integration not implemented fully yet.");
  }

  parseWebhookEvent(_payload: unknown): BillingWebhookEvent {
    throw new Error("Stripe integration not implemented fully yet.");
  }
}
