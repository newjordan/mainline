'use server';

import type { ActionResult } from '@/types';
import type { Message, MessageInsert, ConversationStage } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';
import { getCustomer, updateConversationStage } from '@/lib/actions/customers';
import { sendSMS, sendMessage as sendTwilioMessage } from '@/lib/integrations/twilio';
import {
  ensureStoredMediaReference,
  prepareMediaForTwilioSend,
  resolveMediaUrlForDisplay,
} from '@/lib/services/customer-media';
import {
  getBusinessProfile,
  interpolateBusinessText,
} from '@/lib/config/business-profile';

async function normalizeMessageMediaUrls(messages: Message[]): Promise<Message[]> {
  const supabase = createServiceRoleClient();

  return Promise.all(
    messages.map(async (message) => {
      if (!message.media_urls || message.media_urls.length === 0) {
        return message;
      }

      let storedRefsChanged = false;
      const resolvedMedia = await Promise.all(
        message.media_urls.map(async (url, index) => {
          const storedReferenceResult = await ensureStoredMediaReference({
            customerId: message.customer_id,
            mediaUrl: url,
            source: message.direction === 'inbound' ? 'inbound_message' : 'outbound_message',
            messageSid: message.twilio_sid || undefined,
            mediaIndex: index,
          });

          if (!storedReferenceResult.success) {
            console.error('[Messages] Failed to normalize stored media URL:', storedReferenceResult.error);
            return { storedRef: url, displayUrl: url };
          }

          const storedRef = storedReferenceResult.data;
          if (storedRef !== url) {
            storedRefsChanged = true;
          }

          const displayUrlResult = await resolveMediaUrlForDisplay(storedRef);
          if (!displayUrlResult.success) {
            console.error('[Messages] Failed to create display media URL:', displayUrlResult.error);
            return { storedRef, displayUrl: url };
          }

          return { storedRef, displayUrl: displayUrlResult.data };
        })
      );

      const storedRefs = resolvedMedia.map((entry) => entry.storedRef);
      const displayUrls = resolvedMedia.map((entry) => entry.displayUrl);

      if (storedRefsChanged) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ media_urls: storedRefs })
          .eq('id', message.id);

        if (updateError) {
          console.error('[Messages] Failed to persist normalized media refs:', updateError);
        }
      }

      return {
        ...message,
        media_urls: displayUrls,
      };
    })
  );
}

/**
 * Get all messages for a customer (conversation history)
 */
export async function getMessages(
  customerId: string
): Promise<ActionResult<Message[]>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Messages] getMessages error:', error);
      return { success: false, error: 'Failed to fetch messages' };
    }

    const normalizedMessages = await normalizeMessageMediaUrls(data || []);
    return { success: true, data: normalizedMessages };
  } catch (error) {
    console.error('[Messages] getMessages exception:', error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

/**
 * Create a new message record
 * Used by webhook handler for inbound messages and send action for outbound
 *
 * @param data - Message data including customer_id, direction, body, etc.
 */
export async function createMessage(
  data: MessageInsert
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth as ActionResult<Message>;

  try {
    const supabase = createServiceRoleClient();
    const { data: message, error } = await supabase
      .from('messages')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('[Messages] createMessage error:', error);
      return { success: false, error: 'Failed to create message' };
    }

    console.log(
      `[Messages] Created ${data.direction} message: ${message.id} for customer ${data.customer_id}`
    );
    return { success: true, data: message };
  } catch (error) {
    console.error('[Messages] createMessage exception:', error);
    return { success: false, error: 'Failed to create message' };
  }
}

/**
 * Send an SMS message to a customer
 * Gets customer phone, sends via Twilio, logs to database
 *
 * @param customerId - Database ID of the customer
 * @param body - Message text content
 * @returns ActionResult with the created Message record
 */
export async function sendMessage(
  customerId: string,
  body: string
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  return sendCustomerMessage(customerId, body);
}

async function sendCustomerMessage(
  customerId: string,
  body: string,
  twilioMediaUrls?: string[],
  storedMediaUrls?: string[]
): Promise<ActionResult<Message>> {
  const trimmedBody = body.trim();
  const hasMedia = !!twilioMediaUrls && twilioMediaUrls.length > 0;
  const mediaForStorage = storedMediaUrls && storedMediaUrls.length > 0
    ? storedMediaUrls
    : twilioMediaUrls;

  // Twilio allows media-only messages, but we keep a non-empty body for consistency.
  if (!trimmedBody && !hasMedia) {
    return { success: false, error: 'Message body cannot be empty' };
  }

  try {
    // 1. Get customer to retrieve phone number
    const customerResult = await getCustomer(customerId);
    if (!customerResult.success) {
      return { success: false, error: customerResult.error };
    }
    if (!customerResult.data) {
      console.error(`[Messages] Customer not found: ${customerId}`);
      return { success: false, error: 'Customer not found' };
    }

    const customer = customerResult.data;

    // 2. Send via Twilio
    const sendResult = hasMedia
      ? await sendTwilioMessage(customer.phone_number, trimmedBody, twilioMediaUrls)
      : await sendSMS(customer.phone_number, trimmedBody);
    if (!sendResult.success) {
      console.error(
        `[Messages] Twilio send failed for customer ${customerId}:`,
        sendResult.error
      );

      // Preserve failed send attempt in conversation history for visibility.
      const failedLogResult = await createMessage({
        customer_id: customerId,
        direction: 'outbound',
        body: trimmedBody,
        media_urls: hasMedia ? mediaForStorage : null,
        status: 'failed',
      });

      if (!failedLogResult.success) {
        console.error('[Messages] Failed to log failed send attempt:', failedLogResult.error);
      }

      return { success: false, error: 'Failed to send message' };
    }

    // 3. Create message record in database
    const messageResult = await createMessage({
      customer_id: customerId,
      direction: 'outbound',
      body: trimmedBody,
      media_urls: hasMedia ? mediaForStorage : null,
      twilio_sid: sendResult.data,
      status: 'sent',
    });

    if (!messageResult.success) {
      // Message was sent but logging failed - log warning but return success
      console.warn(
        `[Messages] Message sent but logging failed:`,
        messageResult.error
      );
      // Return a minimal message object since we don't have the DB record
      return {
        success: true,
        data: {
          id: 'unknown',
          customer_id: customerId,
          direction: 'outbound',
          body: trimmedBody,
          media_urls: hasMedia ? mediaForStorage : null,
          twilio_sid: sendResult.data,
          status: 'sent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Message,
      };
    }

    // 4. Log success with masked phone (PII protection)
    const maskedPhone =
      customer.phone_number.slice(0, -4).replace(/\d/g, '*') +
      customer.phone_number.slice(-4);
    const mediaInfo = hasMedia ? ` (${twilioMediaUrls?.length} media)` : '';
    console.log(
      `[Messages] Sent outbound to ${maskedPhone}: ${messageResult.data.id}${mediaInfo}`
    );

    return { success: true, data: messageResult.data };
  } catch (error) {
    console.error('[Messages] sendMessage exception:', error);
    return { success: false, error: 'Failed to send message' };
  }
}

/**
 * Send an outbound message with one media URL.
 * Used for re-sending saved customer photos.
 */
export async function sendMediaMessage(
  customerId: string,
  mediaUrl: string,
  body = 'Here is the photo we discussed.'
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  const trimmedMediaUrl = mediaUrl.trim();
  if (!trimmedMediaUrl) {
    return { success: false, error: 'Media URL is required' };
  }

  try {
    // Validate URL format before trying Twilio.
    new URL(trimmedMediaUrl);
  } catch {
    return { success: false, error: 'Media URL is invalid' };
  }

  const mediaResult = await prepareMediaForTwilioSend({
    customerId,
    mediaUrl: trimmedMediaUrl,
    source: 'outbound_message',
  });

  if (!mediaResult.success) {
    console.error('[Messages] Failed to prepare media for outbound send:', mediaResult.error);
    return { success: false, error: 'Failed to prepare photo for sending' };
  }

  return sendCustomerMessage(
    customerId,
    body,
    [mediaResult.data.twilioUrl],
    [mediaResult.data.storedReference]
  );
}

/**
 * Send Google review request SMS to customer.
 */
export async function sendGoogleReviewRequest(
  customerId: string
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  const reviewUrlRaw = process.env.GOOGLE_REVIEW_URL?.trim();
  if (!reviewUrlRaw) {
    return { success: false, error: 'GOOGLE_REVIEW_URL is not configured' };
  }

  let reviewUrl: string;
  try {
    reviewUrl = new URL(reviewUrlRaw).toString();
  } catch {
    return { success: false, error: 'GOOGLE_REVIEW_URL is invalid' };
  }

  const body = `${interpolateBusinessText(getBusinessProfile().sms.reviewRequest)}\n${reviewUrl}`;

  return sendCustomerMessage(customerId, body);
}

/**
 * Send a quick reply and advance the conversation stage in one action.
 * Used by the guided intake flow.
 */
export async function sendQuickReply(
  customerId: string,
  body: string,
  nextStage: ConversationStage
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  // Send the message first
  const result = await sendCustomerMessage(customerId, body);
  if (!result.success) return result;

  // Advance the stage (best-effort — message already sent)
  const stageResult = await updateConversationStage(customerId, nextStage);
  if (!stageResult.success) {
    console.error('[Messages] Quick reply sent but stage update failed:', stageResult.error);
  }

  return result;
}

/**
 * Update message status (for delivery status webhooks)
 * Used by Story 3.7 (Handle Delivery Status Webhooks)
 */
export async function updateMessageStatus(
  twilioSid: string,
  status: Message['status']
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth as ActionResult<Message>;

  try {
    const supabase = createServiceRoleClient();
    const { data: message, error } = await supabase
      .from('messages')
      .update({ status })
      .eq('twilio_sid', twilioSid)
      .select()
      .single();

    if (error) {
      console.error('[Messages] updateMessageStatus error:', error);
      return { success: false, error: 'Failed to update message status' };
    }

    console.log(`[Messages] Updated status for ${twilioSid}: ${status}`);
    return { success: true, data: message };
  } catch (error) {
    console.error('[Messages] updateMessageStatus exception:', error);
    return { success: false, error: 'Failed to update message status' };
  }
}


/**
 * Retry a failed message
 * Re-sends the message via Twilio and updates the record with new SID
 *
 * @param messageId - Database ID of the message to retry
 * @returns ActionResult with the updated Message record
 */
export async function retryMessage(
  messageId: string
): Promise<ActionResult<Message>> {
  const auth = await requireAdminSession();
  if (!auth.success) return auth;

  try {
    const supabase = createServiceRoleClient();

    // 1. Fetch the message with customer phone number
    const { data: messageWithCustomer, error: fetchError } = await supabase
      .from('messages')
      .select('*, customers!inner(phone_number)')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageWithCustomer) {
      console.error(`[Messages] Message not found for retry: ${messageId}`);
      return { success: false, error: 'Message not found' };
    }

    // 2. Validate message can be retried
    if (
      messageWithCustomer.status !== 'failed' &&
      messageWithCustomer.status !== 'undelivered'
    ) {
      return { success: false, error: 'Only failed messages can be retried' };
    }

    if (messageWithCustomer.direction !== 'outbound') {
      return { success: false, error: 'Can only retry outbound messages' };
    }

    // 3. Extract phone number from joined customer
    const phoneNumber = (
      messageWithCustomer.customers as { phone_number: string }
    ).phone_number;

    // 4. Resend via Twilio
    const sendResult = await sendSMS(phoneNumber, messageWithCustomer.body);

    if (!sendResult.success) {
      console.error(
        `[Messages] Retry send failed for ${messageId}:`,
        sendResult.error
      );
      return { success: false, error: 'Failed to resend message' };
    }

    // 5. Update message with new SID and status
    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        twilio_sid: sendResult.data,
        status: 'sent',
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      // Message was sent but update failed - log warning
      console.error(
        `[Messages] Retry sent but update failed for ${messageId}:`,
        updateError
      );
      return { success: false, error: 'Message sent but record update failed' };
    }

    // 6. Log retry with masked phone (PII protection)
    const maskedPhone =
      phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
    console.log(
      `[Messages] Retried ${messageId} to ${maskedPhone}: ${sendResult.data}`
    );

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Messages] retryMessage exception:', error);
    return { success: false, error: 'Failed to retry message' };
  }
}
