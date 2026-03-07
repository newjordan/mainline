import { NextRequest, NextResponse } from 'next/server';
import { getOrderReferenceId, validateSquareWebhook } from '@/lib/integrations/square';
import {
  markWebhookProcessed,
  unmarkWebhookProcessed,
} from '@/lib/utils/webhook-idempotency';
import {
  getPayableInvoiceByPaymentReference,
  markInvoicePaid,
} from '@/lib/server/invoices';
import { notifyPaymentReceived } from '@/lib/services/payment-notifications';
import {
  extractInvoiceIdFromSquarePaymentNote,
  isSquarePaymentCompleted,
  isSquarePaymentEvent,
  squareWebhookEventSchema,
} from '@/lib/schemas/webhooks/square';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature');

  if (!signature) {
    console.error('[Square Webhook] Missing signature header');
    return new NextResponse('Missing signature', { status: 400 });
  }

  const notificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || request.url;

  const isValid = validateSquareWebhook(payload, signature, notificationUrl);
  if (!isValid) {
    console.error('[Square Webhook] Invalid signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  let eventJson: unknown;
  try {
    eventJson = JSON.parse(payload);
  } catch (error) {
    console.error('[Square Webhook] Invalid JSON payload:', error);
    return new NextResponse('Invalid payload', { status: 400 });
  }

  const parsed = squareWebhookEventSchema.safeParse(eventJson);
  if (!parsed.success) {
    console.error('[Square Webhook] Invalid payload schema:', parsed.error.flatten());
    return new NextResponse('OK', { status: 200 });
  }

  const event = parsed.data;

  try {
    const claimed = await markWebhookProcessed('square', event.event_id, event.type);
    if (!claimed) {
      console.log(`[Square Webhook] Already processed: ${event.event_id}`);
      return new NextResponse('OK', { status: 200 });
    }
  } catch (error) {
    console.error('[Square Webhook] Failed to claim idempotency slot:', error);
    return new NextResponse('Processing error', { status: 500 });
  }

  try {
    if (isSquarePaymentEvent(event.type)) {
      await handlePaymentEvent(event);
    } else {
      console.log(`[Square Webhook] Ignoring unhandled event type: ${event.type}`);
    }

    console.log(`[Square Webhook] Processed: ${event.type}, ID: ${event.event_id}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    const isRetryable =
      error instanceof Error &&
      (error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED'));

    if (isRetryable) {
      console.error('[Square Webhook] Retryable error:', error);
      await unmarkWebhookProcessed('square', event.event_id).catch((unmarkError) => {
        console.error(
          '[Square Webhook] Failed to release idempotency marker:',
          unmarkError
        );
      });
      return new NextResponse('Processing error', { status: 500 });
    }

    console.error('[Square Webhook] Non-retryable error:', error);
    return new NextResponse('OK', { status: 200 });
  }
}

async function handlePaymentEvent(event: {
  event_id: string;
  type: string;
  data?: {
    object?: {
      payment?: {
        id: string;
        status: string;
        order_id?: string | null;
        note?: string | null;
      };
    };
  };
}) {
  const payment = event.data?.object?.payment;
  if (!payment) {
    console.log(`[Square Webhook] Event ${event.event_id} missing payment object, skipping`);
    return;
  }

  if (!isSquarePaymentCompleted(payment)) {
    console.log(
      `[Square Webhook] Payment ${payment.id} has status=${payment.status}, skipping`
    );
    return;
  }

  let invoiceId = extractInvoiceIdFromSquarePaymentNote(payment.note);

  if (!invoiceId && payment.order_id) {
    const orderResult = await getOrderReferenceId(payment.order_id);
    if (orderResult.success && orderResult.data) {
      const extractedFromReference = extractInvoiceIdFromSquarePaymentNote(
        orderResult.data
      );
      if (extractedFromReference) {
        invoiceId = extractedFromReference;
      }
    }
  }

  if (!invoiceId && payment.order_id) {
    const invoiceResult = await getPayableInvoiceByPaymentReference(payment.order_id);
    if (invoiceResult.success && invoiceResult.data) {
      invoiceId = invoiceResult.data.id;
    }
  }

  if (!invoiceId) {
    console.warn(
      `[Square Webhook] Payment ${payment.id} has no invoice identifier, skipping`
    );
    return;
  }

  const paymentId = payment.id || payment.order_id || `event_${event.event_id}`;

  const result = await markInvoicePaid(invoiceId, paymentId);

  if (result.success) {
    console.log(
      `[Square Webhook] Invoice ${invoiceId.slice(0, 8)}... marked as paid (payment: ${paymentId})`
    );
    notifyPaymentReceived(invoiceId).catch((err) => {
      console.error('[Square Webhook] Payment notification failed:', err);
    });
  } else {
    const retryableErrors = new Set(['Failed to fetch invoice', 'Failed to update invoice']);
    if (result.error && retryableErrors.has(result.error)) {
      throw new Error(`Retryable invoice update failure: ${result.error}`);
    }

    console.error(
      `[Square Webhook] Failed to mark invoice ${invoiceId.slice(0, 8)}... paid: ${result.error}`
    );
  }
}

