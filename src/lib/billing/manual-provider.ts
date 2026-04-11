import { ExternalSubscription, IBillingProvider, BillingWebhookEvent } from "./billing.interface";
import { PlanName } from "../plans/plan-limits";

/**
 * Provider "manual" — sem gateway de pagamento real.
 *
 * Usado em desenvolvimento e para tenants pagos por boleto/PIX manual.
 * Métodos de billing externos retornam stubs que não emitem cobrança.
 *
 * Args com prefixo `_` são intencionalmente ignorados (interface fixa).
 */
export class ManualBillingProvider implements IBillingProvider {
  provider = 'manual' as const;

  async createCustomer(tenantId: string, _email: string, _name: string): Promise<string> {
    return `manual_cus_${tenantId}`;
  }

  async createSubscription(_customerId: string, _planName: PlanName): Promise<ExternalSubscription> {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    return {
      id: `manual_sub_${Date.now()}`,
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    console.log(`[ManualBilling] Subscrição cancelada: ${subscriptionId}`);
  }

  async createCheckoutSession(
    customerId: string,
    planName: PlanName,
    successUrl: string,
    _cancelUrl: string
  ): Promise<string> {
    console.log(`[ManualBilling] Checkout fake criado para ${customerId} plano ${planName}`);
    return successUrl; // No manual ele pula direto
  }

  async getPortalUrl(_customerId: string, returnUrl: string): Promise<string> {
    return returnUrl;
  }

  validateWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    return true; // Sem assinatura para validar no manual
  }

  parseWebhookEvent(payload: unknown): BillingWebhookEvent {
    return {
      type: 'manual_event',
      originalEvent: payload,
    };
  }
}
