import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { validateSquareEnv } from '@/lib/env';
import type { ActionResult } from '@/types';
import { getBusinessProfile } from '@/lib/config/business-profile';

const SQUARE_VERSION = '2025-10-16';

let squareEnv: ReturnType<typeof validateSquareEnv> | null = null;

function getSquareEnv(): ReturnType<typeof validateSquareEnv> {
  if (!squareEnv) {
    squareEnv = validateSquareEnv();
  }
  return squareEnv;
}

function getApiBaseUrl(): string {
  const env = getSquareEnv();
  return env.SQUARE_ENVIRONMENT === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
}

function getWebhookSignatureKey(): string {
  return getSquareEnv().SQUARE_WEBHOOK_SIGNATURE_KEY;
}

function getSquareErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown Square error';
  }

  if (error.message === 'Missing or invalid Square configuration') {
    return 'Square is not configured. Set SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, and SQUARE_WEBHOOK_SIGNATURE_KEY.';
  }

  return error.message;
}

function parseApiErrors(errors: unknown): string | null {
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  const messages = errors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const detail = (entry as { detail?: unknown }).detail;
      const code = (entry as { code?: unknown }).code;
      if (typeof detail === 'string' && typeof code === 'string') {
        return `[${code}] ${detail}`;
      }
      if (typeof detail === 'string') {
        return detail;
      }
      if (typeof code === 'string') {
        return code;
      }
      return null;
    })
    .filter((value): value is string => !!value);

  return messages.length > 0 ? messages.join('; ') : null;
}

export interface CreatePaymentLinkOptions {
  amountCents: number;
  description: string;
  metadata: Record<string, string>;
  successUrl?: string;
  idempotencyKey?: string;
}

export interface PaymentLinkResult {
  url: string;
  providerPaymentId: string | null;
}

type SquareCreatePaymentLinkResponse = {
  payment_link?: {
    id?: string;
    url?: string;
    order_id?: string | null;
  };
  errors?: unknown;
};

type SquareRetrieveOrderResponse = {
  order?: {
    id?: string;
    reference_id?: string | null;
  };
  errors?: unknown;
};

type SquareRetrievePaymentResponse = {
  payment?: {
    id?: string;
    status?: string;
    receipt_url?: string | null;
  };
  errors?: unknown;
};

export async function createPaymentLink(
  options: CreatePaymentLinkOptions
): Promise<ActionResult<PaymentLinkResult>> {
  const { amountCents, description, metadata, successUrl, idempotencyKey } = options;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { success: false, error: 'Amount must be a positive integer in cents' };
  }

  try {
    const env = getSquareEnv();
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || getBusinessProfile().defaults.websiteUrl;
    const redirectUrl = successUrl || `${baseUrl}/payment-success`;
    const invoiceId = metadata.invoiceId;

    const response = await fetch(`${getApiBaseUrl()}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION,
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey || randomUUID(),
        description,
        checkout_options: {
          redirect_url: redirectUrl,
        },
        order: {
          location_id: env.SQUARE_LOCATION_ID,
          reference_id: invoiceId,
          line_items: [
            {
              name: description,
              quantity: '1',
              base_price_money: {
                amount: amountCents,
                currency: 'USD',
              },
            },
          ],
        },
        payment_note: invoiceId ? `invoice:${invoiceId}` : undefined,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as SquareCreatePaymentLinkResponse;
    const apiErrorMessage = parseApiErrors(body.errors);

    if (!response.ok) {
      const message = apiErrorMessage || `Square API returned status ${response.status}`;
      console.error('[Square] Payment link creation failed:', message);
      return { success: false, error: `Failed to create payment link: ${message}` };
    }

    const paymentLink = body.payment_link;
    if (!paymentLink?.url) {
      console.error('[Square] Payment link creation failed: missing payment_link.url');
      return { success: false, error: 'Failed to create payment link: Missing payment link URL' };
    }

    console.log(
      `[Square] Payment link created: ${paymentLink.url}, Invoice: ${invoiceId || 'N/A'}`
    );

    return {
      success: true,
      data: {
        url: paymentLink.url,
        providerPaymentId: paymentLink.order_id || paymentLink.id || null,
      },
    };
  } catch (error) {
    const errorMessage = getSquareErrorMessage(error);
    console.error('[Square] Payment link creation error:', errorMessage);
    return { success: false, error: `Failed to create payment link: ${errorMessage}` };
  }
}

export async function getOrderReferenceId(
  orderId: string
): Promise<ActionResult<string | null>> {
  if (!orderId || orderId.trim() === '') {
    return { success: true, data: null };
  }

  try {
    const env = getSquareEnv();
    const response = await fetch(`${getApiBaseUrl()}/v2/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION,
      },
    });

    const body = (await response.json().catch(() => ({}))) as SquareRetrieveOrderResponse;
    const apiErrorMessage = parseApiErrors(body.errors);

    if (!response.ok) {
      const message = apiErrorMessage || `Square API returned status ${response.status}`;
      console.error('[Square] Order retrieval failed:', message);
      return { success: false, error: `Failed to retrieve order: ${message}` };
    }

    return { success: true, data: body.order?.reference_id ?? null };
  } catch (error) {
    const errorMessage = getSquareErrorMessage(error);
    console.error('[Square] Order retrieval error:', errorMessage);
    return { success: false, error: `Failed to retrieve order: ${errorMessage}` };
  }
}

export async function getPaymentReceiptUrl(
  paymentId: string
): Promise<ActionResult<string | null>> {
  if (!paymentId || paymentId.trim() === '') {
    return { success: true, data: null };
  }

  try {
    const env = getSquareEnv();
    const response = await fetch(`${getApiBaseUrl()}/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION,
      },
    });

    const body = (await response.json().catch(() => ({}))) as SquareRetrievePaymentResponse;
    const apiErrorMessage = parseApiErrors(body.errors);

    if (!response.ok) {
      const message = apiErrorMessage || `Square API returned status ${response.status}`;
      console.error('[Square] Payment retrieval failed:', message);
      return { success: false, error: `Failed to retrieve payment: ${message}` };
    }

    return { success: true, data: body.payment?.receipt_url ?? null };
  } catch (error) {
    const errorMessage = getSquareErrorMessage(error);
    console.error('[Square] Payment retrieval error:', errorMessage);
    return { success: false, error: `Failed to retrieve payment: ${errorMessage}` };
  }
}

export function validateSquareWebhook(
  payload: string,
  signature: string,
  notificationUrl: string
): boolean {
  try {
    if (!notificationUrl) {
      console.error('[Square] Webhook validation failed: missing notification URL');
      return false;
    }

    const expectedSignature = createHmac('sha256', getWebhookSignatureKey())
      .update(`${notificationUrl}${payload}`)
      .digest('base64');

    const provided = Buffer.from(signature.trim());
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(provided, expected);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Square] Webhook validation failed:', errorMessage);
    return false;
  }
}
