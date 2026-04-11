import { ExternalSubscription, IBillingProvider, BillingWebhookEvent } from "./billing.interface";
import { PlanName } from "../plans/plan-limits";

/**
 * Provider MercadoPago — IMPLEMENTAÇÃO PLANEJADA PARA A FASE 3.
 *
 * A validação de webhook já é feita inline em
 * `app/api/webhooks/mercadopago/route.ts` (assinatura HMAC do MP).
 * Esta classe vai ser usada para criar Preferências de pagamento e
 * checkout (Bricks/Checkout Pro) quando a integração for finalizada.
 *
 * Args com prefixo `_` são intencionalmente ignorados até a implementação.
 */
export class MercadoPagoBillingProvider implements IBillingProvider {
  provider = 'mercadopago' as const;

  async createCustomer(_tenantId: string, _email: string, _name: string): Promise<string> {
    throw new Error("MP integration not implemented fully yet.");
  }

  async createSubscription(_customerId: string, _planName: PlanName): Promise<ExternalSubscription> {
    throw new Error("MP integration not implemented fully yet.");
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    throw new Error("MP integration not implemented fully yet.");
  }

  async createCheckoutSession(
    _customerId: string,
    _planName: PlanName,
    _successUrl: string,
    _cancelUrl: string
  ): Promise<string> {
    throw new Error("MP integration not implemented fully yet.");
  }

  async getPortalUrl(_customerId: string, _returnUrl: string): Promise<string> {
    throw new Error("MP integration not implemented fully yet.");
  }

  validateWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    throw new Error("MP integration not implemented fully yet.");
  }

  parseWebhookEvent(_payload: unknown): BillingWebhookEvent {
    throw new Error("MP integration not implemented fully yet.");
  }
}
