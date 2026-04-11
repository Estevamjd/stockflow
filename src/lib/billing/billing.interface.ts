import { PlanName } from "../plans/plan-limits";

export interface ExternalSubscription {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface BillingWebhookEvent {
  type: string;
  originalEvent: unknown;
}

export interface IBillingProvider {
  provider: 'stripe' | 'mercadopago' | 'manual';

  createCustomer(tenantId: string, email: string, name: string): Promise<string>;
  createSubscription(customerId: string, planName: PlanName): Promise<ExternalSubscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  createCheckoutSession(customerId: string, planName: PlanName, successUrl: string, cancelUrl: string): Promise<string>;
  getPortalUrl(customerId: string, returnUrl: string): Promise<string>;
  validateWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: unknown): BillingWebhookEvent;
}
