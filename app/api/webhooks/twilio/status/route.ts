import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioSignature } from '@/lib/integrations/twilio';
import { twilioStatusCallbackSchema } from '@/lib/schemas/webhooks/twilio';
import { updateMessageStatus } from '@/lib/server/messages';
import type { Message } from '@/lib/database.types';
import {
  markWebhookProcessed,
  unmarkWebhookProcessed,
} from '@/lib/utils/webhook-idempotency';

function normalizeTwilioStatus(status: string): Message['status'] {
  const normalized = status.toLowerCase();

  if (normalized === 'queued' || normalized === 'accepted' || normalized === 'scheduled') {
    return 'queued';
  }

  if (normalized === 'sending' || normalized === 'sent') {
    return 'sent';
  }

  if (normalized === 'delivered' || normalized === 'read') {
    return 'delivered';
  }

  if (normalized === 'undelivered' || normalized === 'partially_delivered') {
    return 'undelivered';
  }

  if (normalized === 'failed' || normalized === 'canceled') {
    return 'failed';
  }

  console.warn(`[StatusWebhook] Unrecognized Twilio status "${status}", defaulting to sent`);
  return 'sent';
}

/**
 * Twilio Message Status Callback Webhook Handler
 *
 * Security: Validates Twilio signature before processing
 * Idempotency: Checks webhook_events table to prevent duplicate processing
 * Performance: Returns 200 quickly after processing
 *
 * Flow:
 * 1. Extract signature, parse form data, construct URL
 * 2. Validate signature FIRST (reject 403 if invalid)
 * 3. Parse payload with Zod schema
 * 4. Claim idempotency slot (return 200 if already processed)
 * 5. Update message status in database
 * 6. Log failures with error details
 * 7. Release claim + return 500 when retryable
 * 8. Return 200 on success
 */
export async function POST(request: NextRequest) {
  // 1. Extract signature from header
  const signature = request.headers.get('X-Twilio-Signature') || '';

  // 2. Parse form data and build params object
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // 3. Use exact webhook URL for signature validation (preserves query/proxy details)
  const webhookUrl = request.url;

  // 4. Validate signature FIRST - reject if invalid
  if (!validateTwilioSignature(signature, webhookUrl, params)) {
    console.error('[StatusWebhook] Invalid Twilio signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 5. Parse and validate payload with Zod schema
  const parsed = twilioStatusCallbackSchema.safeParse(params);
  if (!parsed.success) {
    console.error('[StatusWebhook] Invalid payload:', parsed.error.flatten());
    return new NextResponse('Invalid payload', { status: 400 });
  }

  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = parsed.data;

  // 6. Create unique event ID (MessageSid + Status to allow multiple status updates per message)
  const eventId = `${MessageSid}:${MessageStatus}`;

  // 7. Claim idempotency slot (single-query check+mark to avoid race conditions)
  try {
    const claimed = await markWebhookProcessed(
      'twilio-status',
      eventId,
      `status.${MessageStatus}`
    );
    if (!claimed) {
      console.log(`[StatusWebhook] Already processed: ${eventId}`);
      return new NextResponse('OK', { status: 200 });
    }
  } catch (error) {
    console.error('[StatusWebhook] Failed to claim idempotency slot:', error);
    return new NextResponse('Internal error', { status: 500 });
  }

  // 8. Update message status in database (normalize Twilio status to DB enum)
  const normalizedStatus = normalizeTwilioStatus(MessageStatus);
  const result = await updateMessageStatus(MessageSid, normalizedStatus);

  // 9. Log failures with error details for debugging
  if (normalizedStatus === 'failed' || normalizedStatus === 'undelivered') {
    console.error(
      `[StatusWebhook] Message ${MessageSid} ${MessageStatus}: ${ErrorCode || 'no code'} - ${ErrorMessage || 'no message'}`
    );
  }

  if (!result.success) {
    // Message may not exist yet (race condition with outbound logging). Release marker and retry.
    console.warn(
      `[StatusWebhook] Could not update status for ${MessageSid}:`,
      result.error
    );
    await unmarkWebhookProcessed('twilio-status', eventId).catch((unmarkError) => {
      console.error('[StatusWebhook] Failed to release idempotency marker:', unmarkError);
    });
    return new NextResponse('Retry later', { status: 500 });
  } else {
    console.log(`[StatusWebhook] Updated ${MessageSid} → ${normalizedStatus} (raw: ${MessageStatus})`);
  }

  // 10. Return 200 immediately
  return new NextResponse('OK', { status: 200 });
}

