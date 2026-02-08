import { kiaraRequest } from "@/services/kiaraClient";

export interface StripePrice {
  id: string;
  currency: string;
  unit_amount: number | null;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  product: {
    id: string;
    name: string | null;
    description: string | null;
    images: string[];
    metadata: Record<string, string>;
  } | null;
  nickname: string | null;
  metadata: Record<string, string>;
}

export interface StripePricesResponse {
  prices: StripePrice[];
}

export interface StripeCheckoutResponse {
  url: string;
  session_id?: string;
}

export interface StripePortalResponse {
  url: string;
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  status: string | null;
  currency: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  total: number;
  subtotal: number;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: number | null;
  period_end: number | null;
  subscription: string | null;
}

export interface StripeInvoicesResponse {
  invoices: StripeInvoice[];
}

export const listStripePrices = async (): Promise<StripePricesResponse> => {
  return kiaraRequest<StripePricesResponse>("stripe-prices", {});
};

export const createCheckoutSession = async (params: {
  priceId: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<StripeCheckoutResponse> => {
  return kiaraRequest<StripeCheckoutResponse>("stripe-checkout", params);
};

export const createBillingPortalSession = async (params?: { returnUrl?: string }): Promise<StripePortalResponse> => {
  return kiaraRequest<StripePortalResponse>("stripe-portal", params ?? {});
};

export const listInvoices = async (params?: { limit?: number }): Promise<StripeInvoicesResponse> => {
  return kiaraRequest<StripeInvoicesResponse>("stripe-invoices", params ?? {});
};
