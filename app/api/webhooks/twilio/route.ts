import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioSignature, sendSMS } from '@/lib/integrations/twilio';
import { twilioInboundMessageSchema } from '@/lib/schemas/webhooks/twilio';
import { findOrCreateCustomer, updateSmsConsent, updateConversationStage } from '@/lib/server/customers';
import { createMessage } from '@/lib/server/messages';
import {
  findQuoteByConfirmationCode,
  getPendingQuotesForCustomer,
  acceptQuoteWithAudit,
} from '@/lib/server/quotes';
import {
  markWebhookProcessed,
  unmarkWebhookProcessed,
} from '@/lib/utils/webhook-idempotency';
import { formatCents } from '@/lib/utils/format-currency';
import { ensureStoredMediaReference } from '@/lib/services/customer-media';
import {
  SMS_OPT_IN_REQUEST,
  SMS_OPT_IN_CONFIRMED,
  SMS_OPT_OUT_CONFIRMED,
  SMS_HELP_RESPONSE,
} from '@/lib/constants/messages';
import {
  getBusinessProfile,
  interpolateBusinessText,
} from '@/lib/config/business-profile';

function normalizePhoneForComparison(phone: string): string {
  return phone.replace(/\D/g, '');
}

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    getBusinessProfile().defaults.websiteUrl;
  try {
    return new URL(raw).origin;
  } catch {
    return getBusinessProfile().defaults.websiteUrl;
  }
}

async function notifyAdminOfInboundMessage(params: {
  from: string;
  body: string;
  customerId: string;
  customerName?: string | null;
  mediaCount: number;
}): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  if (!adminPhone) return;
  const { from, body, customerId, customerName, mediaCount } = params;

  // Prevent loops if admin number is ever used as sender.
  if (normalizePhoneForComparison(adminPhone) === normalizePhoneForComparison(from)) return;

  const condensedBody = body.replace(/\s+/g, ' ').trim();
  const bodyPreview =
    condensedBody.length > 90 ? `${condensedBody.slice(0, 87)}...` : condensedBody || '[empty]';
  const customerLabel = customerName?.trim() || from;
  const mediaSuffix = mediaCount > 0 ? ` +${mediaCount} media` : '';
  const customerUrl = `${resolveSiteUrl()}/customers/${customerId}`;
  const notification =
    `[Inbound] ${customerLabel} (${from})${mediaSuffix}\n` +
    `${bodyPreview}\n` +
    `Open: ${customerUrl}\n` +
    `Shared SMS alert thread: use app for per-customer threads.`;

  const smsResult = await sendSMS(adminPhone, notification);
  if (!smsResult.success) {
    console.error('[Webhook] Failed to notify admin of inbound message:', smsResult.error);
  }
}

/**
 * Check if message is an opt-in keyword (START, JOIN, YES, SUBSCRIBE)
 */
function isOptInKeyword(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return ['start', 'join', 'subscribe', 'unstop'].includes(normalized);
}

/**
 * Check if message is an opt-out keyword (STOP, UNSUBSCRIBE, CANCEL, END, QUIT)
 */
function isOptOutKeyword(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return ['stop', 'unsubscribe', 'cancel', 'end', 'quit', 'stopall'].includes(normalized);
}

/**
 * Check if message is a help keyword (HELP, INFO)
 */
function isHelpKeyword(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return ['help', 'info'].includes(normalized);
}

/**
 * Parse quote acceptance message with confirmation code
 *
 * Accepts formats:
 * - "YES 1234"
 * - "yes 1234"
 * - "Yes1234"
 * - "YES  1234" (extra spaces)
 *
 * @returns confirmation code if valid, null otherwise
 */
function parseQuoteAcceptance(message: string): string | null {
  const normalized = message.trim().toUpperCase();

  // Match "YES" followed by 4 digits (with optional whitespace)
  const match = normalized.match(/^YES\s*(\d{4})$/);

  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Check if message is a plain YES without code
 */
function isPlainYes(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return ['yes', 'yes!', 'yes.', 'yep', 'yeah', 'y'].includes(normalized);
}

/**
 * Send SMS and log to conversation
 */
async function sendAndLog(
  customerId: string,
  phoneNumber: string,
  body: string
): Promise<void> {
  const sendResult = await sendSMS(phoneNumber, body);
  if (!sendResult.success) {
    console.error('[Webhook] Failed to send SMS:', sendResult.error);
  }

  const messageResult = await createMessage({
    customer_id: customerId,
    direction: 'outbound',
    body,
    twilio_sid: sendResult.success ? sendResult.data : undefined,
    status: sendResult.success ? 'sent' : 'failed',
  });

  if (!messageResult.success) {
    console.error('[Webhook] Failed to log message:', messageResult.error);
  }
}

/**
 * Twilio Inbound SMS/MMS Webhook Handler
 *
 * Security: Validates Twilio signature before processing
 * Idempotency: Checks webhook_events table to prevent duplicate processing
 * Compliance: Handles START/STOP/HELP keywords for SMS opt-in/out
 *
 * Flow:
 * 1. Validate Twilio signature
 * 2. Parse and validate payload
 * 3. Collect media metadata
 * 4. Claim idempotency slot
 * 5. Find or create customer
 * 6. Mirror inbound Twilio media to private customer storage
 * 7. Handle compliance keywords (STOP, HELP, START)
 * 8. For new customers: send opt-in request, wait for START
 * 9. For opted-in customers: process message normally
 * 10. Handle quote acceptance (YES detection with confirmation code)
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
    console.error('[Webhook] Invalid Twilio signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 5. Parse and validate payload with Zod schema
  const parsed = twilioInboundMessageSchema.safeParse(params);
  if (!parsed.success) {
    console.error('[Webhook] Invalid payload:', parsed.error.flatten());
    return new NextResponse('Invalid payload', { status: 400 });
  }

  const { MessageSid, From, Body, NumMedia } = parsed.data;

  // Collect all media metadata (Twilio sends MediaUrl0 through MediaUrl9).
  const inboundMedia: Array<{ url: string; contentType?: string; index: number }> = [];
  for (let i = 0; i < NumMedia && i < 10; i++) {
    const urlKey = `MediaUrl${i}` as keyof typeof parsed.data;
    const contentTypeKey = `MediaContentType${i}` as keyof typeof parsed.data;
    const mediaUrl = parsed.data[urlKey];
    const mediaContentType = parsed.data[contentTypeKey];
    if (typeof mediaUrl === 'string') {
      inboundMedia.push({
        url: mediaUrl,
        contentType: typeof mediaContentType === 'string' ? mediaContentType : undefined,
        index: i,
      });
    }
  }

  // 6. Claim idempotency slot (single-query check+mark to avoid race conditions)
  try {
    const claimed = await markWebhookProcessed('twilio', MessageSid, 'message.received');
    if (!claimed) {
      console.log(`[Webhook] Already processed: ${MessageSid}`);
      return new NextResponse('OK', { status: 200 });
    }
  } catch (error) {
    console.error('[Webhook] Failed to claim idempotency slot:', error);
    return new NextResponse('Internal error', { status: 500 });
  }

  try {
    // 7. Process business logic after successful claim
    // Mask phone for PII protection
    const maskedPhone = From.slice(0, -4).replace(/\d/g, '*') + From.slice(-4);

    // 8. Find or create customer by phone number
    const customerResult = await findOrCreateCustomer(From);
    if (!customerResult.success) {
      console.error('[Webhook] Failed to find/create customer:', customerResult.error);
      await unmarkWebhookProcessed('twilio', MessageSid).catch((unmarkError) => {
        console.error('[Webhook] Failed to release idempotency marker:', unmarkError);
      });
      return new NextResponse('Internal error', { status: 500 });
    }

    const { customer, isNew } = customerResult.data;
    if (isNew) {
      console.log(`[Webhook] New customer created: ${customer.id} (${maskedPhone})`);
    }

    const storedMediaRefs = await Promise.all(
      inboundMedia.map(async (media) => {
        const mediaResult = await ensureStoredMediaReference({
          customerId: customer.id,
          mediaUrl: media.url,
          source: 'inbound_message',
          messageSid: MessageSid,
          mediaIndex: media.index,
          fallbackContentType: media.contentType,
        });

        if (!mediaResult.success) {
          console.error('[Webhook] Failed to prepare inbound media for storage:', mediaResult.error);
          return media.url;
        }

        return mediaResult.data;
      })
    );

    // 9. Create inbound message record (always log incoming messages)
    const messageResult = await createMessage({
      customer_id: customer.id,
      direction: 'inbound',
      body: Body,
      media_urls: storedMediaRefs.length > 0 ? storedMediaRefs : null,
      twilio_sid: MessageSid,
      status: 'delivered',
    });

    if (!messageResult.success) {
      console.error('[Webhook] Failed to create message:', messageResult.error);
      await unmarkWebhookProcessed('twilio', MessageSid).catch((unmarkError) => {
        console.error('[Webhook] Failed to release idempotency marker:', unmarkError);
      });
      return new NextResponse('Internal error', { status: 500 });
    }

    // Optional admin alert routing for inbound customer messages.
    await notifyAdminOfInboundMessage({
      from: From,
      body: Body,
      customerId: customer.id,
      customerName: customer.name,
      mediaCount: storedMediaRefs.length,
    });

    // 10. Handle STOP keyword (always process, even if not opted in)
    if (isOptOutKeyword(Body)) {
      console.log(`[Webhook] STOP received from ${maskedPhone}`);
      await updateSmsConsent(customer.id, false);
      await sendAndLog(customer.id, From, SMS_OPT_OUT_CONFIRMED);
      return new NextResponse('OK', { status: 200 });
    }

    // 11. Handle HELP keyword (always process)
    if (isHelpKeyword(Body)) {
      console.log(`[Webhook] HELP received from ${maskedPhone}`);
      await sendAndLog(customer.id, From, SMS_HELP_RESPONSE);
      return new NextResponse('OK', { status: 200 });
    }

    // 12. Handle START keyword (opt-in)
    if (isOptInKeyword(Body)) {
      console.log(`[Webhook] START received from ${maskedPhone}`);
      await updateSmsConsent(customer.id, true);
      await updateConversationStage(customer.id, 'awaiting_problem');
      await sendAndLog(customer.id, From, SMS_OPT_IN_CONFIRMED);
      return new NextResponse('OK', { status: 200 });
    }

    // 13. Check SMS consent status
    const hasConsent = customer.sms_consent === true;

    // 14. For new customers or those without consent: send opt-in request
    if (isNew || !hasConsent) {
      console.log(`[Webhook] Sending opt-in request to ${maskedPhone} (new: ${isNew}, consent: ${hasConsent})`);
      await sendAndLog(customer.id, From, SMS_OPT_IN_REQUEST);
      return new NextResponse('OK', { status: 200 });
    }

    // ========================================
    // OPTED-IN CUSTOMER - PROCESS MESSAGE
    // ========================================

    // 15. Handle quote acceptance (secure YES detection)
    const confirmationCode = parseQuoteAcceptance(Body);

    if (confirmationCode) {
      // User sent "YES 1234" - find quote by confirmation code
      const quoteResult = await findQuoteByConfirmationCode(customer.id, confirmationCode);

      if (quoteResult.success && quoteResult.data) {
        const quote = quoteResult.data;

        // Accept the quote with audit logging
        const acceptResult = await acceptQuoteWithAudit(
          quote.id,
          'customer',
          customer.id,
          {
            confirmation_code: confirmationCode,
            message_sid: MessageSid,
          }
        );

        if (acceptResult.success) {
          console.log(`[Webhook] Quote ${quote.short_ref} accepted by ${maskedPhone}`);
          const confirmationMsg = `Quote ${quote.short_ref} accepted! ${interpolateBusinessText(
            getBusinessProfile().sms.acceptedFollowup
          )}`;
          await sendAndLog(customer.id, From, confirmationMsg);
        } else {
          console.error(`[Webhook] Failed to accept quote ${quote.short_ref}:`, acceptResult.error);
          await sendAndLog(customer.id, From, `Sorry, we couldn't process your acceptance. Please try again or reply HELP.`);
        }
      } else {
        // Code doesn't match any pending quote
        console.log(`[Webhook] Invalid confirmation code ${confirmationCode} from ${maskedPhone}`);
        await sendAndLog(
          customer.id,
          From,
          `Sorry, code ${confirmationCode} doesn't match any pending quotes. Please check the code and try again, or reply HELP.`
        );
      }
    } else if (isPlainYes(Body)) {
      // User sent just "YES" without code - handle based on pending quote count
      const pendingResult = await getPendingQuotesForCustomer(customer.id);

      if (!pendingResult.success) {
        console.error('[Webhook] Failed to get pending quotes:', pendingResult.error);
      } else {
        const pendingQuotes = pendingResult.data;

        if (pendingQuotes.length === 0) {
          await sendAndLog(customer.id, From, `You don't have any pending quotes. Reply HELP for assistance.`);
        } else if (pendingQuotes.length === 1) {
          // Exactly 1 pending quote - auto-accept
          const quote = pendingQuotes[0];

          const acceptResult = await acceptQuoteWithAudit(
            quote.id,
            'customer',
            customer.id,
            {
              auto_accepted: true,
              message_sid: MessageSid,
            }
          );

          if (acceptResult.success) {
            console.log(`[Webhook] Quote ${quote.short_ref} auto-accepted by ${maskedPhone}`);
            const confirmationMsg = `Quote ${quote.short_ref} for ${formatCents(quote.total_cents)} accepted! ${interpolateBusinessText(
              getBusinessProfile().sms.acceptedFollowup
            )}`;
            await sendAndLog(customer.id, From, confirmationMsg);
          } else {
            console.error(`[Webhook] Failed to auto-accept quote ${quote.short_ref}:`, acceptResult.error);
          }
        } else {
          // Multiple pending quotes - send list with codes
          let msg = `You have ${pendingQuotes.length} pending quotes. Reply with the code to accept:\n`;
          pendingQuotes.forEach((q) => {
            msg += `\n${q.short_ref}: ${formatCents(q.total_cents)} → YES ${q.confirmation_code}`;
          });
          await sendAndLog(customer.id, From, msg);
        }
      }
    }

    // 16. Auto-acknowledge general messages (not quote-related)
    if (!confirmationCode && !isPlainYes(Body)) {
      await sendAndLog(customer.id, From, 'Received! We\'ll get back to you shortly.');
    }

    // 17. Return 200 - message processed
    const mediaInfo = storedMediaRefs.length > 0 ? ` (${storedMediaRefs.length} media)` : '';
    console.log(`[Webhook] Processed inbound from ${maskedPhone}: ${MessageSid}${mediaInfo}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    await unmarkWebhookProcessed('twilio', MessageSid).catch((unmarkError) => {
      console.error('[Webhook] Failed to release idempotency marker:', unmarkError);
    });
    return new NextResponse('Internal error', { status: 500 });
  }
}
