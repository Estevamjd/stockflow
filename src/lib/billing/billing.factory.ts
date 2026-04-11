import { IBillingProvider } from "./billing.interface";
import { ManualBillingProvider } from "./manual-provider";
import { StripeBillingProvider } from "./stripe-provider";
import { MercadoPagoBillingProvider } from "./mercadopago-provider";

export const BillingFactory = (): IBillingProvider => {
  const provider = process.env.BILLING_PROVIDER || 'manual';

  switch (provider) {
    case 'stripe':
      return new StripeBillingProvider();
    case 'mercadopago':
      return new MercadoPagoBillingProvider();
    case 'manual':
    default:
      return new ManualBillingProvider();
  }
};

export const getBillingProvider = () => BillingFactory();
