import 'server-only';

import type { ActionResult } from '@/types';
import {
  createPaymentLink as createSquarePaymentLink,
  getPaymentReceiptUrl as getSquarePaymentReceiptUrl,
  type CreatePaymentLinkOptions,
  type PaymentLinkResult,
} from '@/lib/integrations/square';
import { resolvePaymentProvider, type PaymentProvider } from '@/lib/payments/provider';

export type { CreatePaymentLinkOptions, PaymentLinkResult };

export const PAYMENTS_DISABLED_ERROR =
  'Online payments are disabled. Set PAYMENT_PROVIDER=square and configure Square credentials to send invoice payment links.';

export function getConfiguredPaymentProvider(): PaymentProvider {
  return resolvePaymentProvider({
    paymentProvider: process.env.PAYMENT_PROVIDER,
    squareAccessToken: process.env.SQUARE_ACCESS_TOKEN,
    squareLocationId: process.env.SQUARE_LOCATION_ID,
    squareWebhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  });
}

export function isPaymentsDisabledError(error: string | undefined): boolean {
  return error === PAYMENTS_DISABLED_ERROR;
}

export async function createPaymentLink(
  options: CreatePaymentLinkOptions
): Promise<ActionResult<PaymentLinkResult>> {
  if (getConfiguredPaymentProvider() === 'none') {
    return { success: false, error: PAYMENTS_DISABLED_ERROR };
  }

  return createSquarePaymentLink(options);
}

export async function getPaymentReceiptUrl(
  paymentId: string
): Promise<ActionResult<string | null>> {
  if (getConfiguredPaymentProvider() === 'none') {
    return { success: true, data: null };
  }

  return getSquarePaymentReceiptUrl(paymentId);
}
