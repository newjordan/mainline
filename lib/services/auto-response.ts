import { sendSMS } from '@/lib/integrations/twilio';
import { createMessage } from '@/lib/server/messages';
import { NEW_CUSTOMER_AUTO_RESPONSE } from '@/lib/constants/messages';

/**
 * Sends an auto-response to a new customer asking for their info
 * Logs the outbound message to the database
 *
 * @param customerId - Database ID of the customer
 * @param phoneNumber - Customer phone in E.164 format
 * @returns Success/failure result (never throws)
 */
export async function sendAutoResponse(
  customerId: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Send SMS via Twilio
    const sendResult = await sendSMS(phoneNumber, NEW_CUSTOMER_AUTO_RESPONSE);

    if (!sendResult.success) {
      console.error('[AutoResponse] Send failed:', sendResult.error);
      return { success: false, error: sendResult.error };
    }

    // 2. Log as outbound message in database
    const messageResult = await createMessage({
      customer_id: customerId,
      direction: 'outbound',
      body: NEW_CUSTOMER_AUTO_RESPONSE,
      twilio_sid: sendResult.data, // SID from Twilio
      status: 'sent',
    });

    if (!messageResult.success) {
      // Message sent but logging failed - log warning but return success
      // The customer received the message, that's what matters
      console.warn('[AutoResponse] Message sent but logging failed:', messageResult.error);
    }

    // Mask phone number for privacy (show last 4 digits only)
    const maskedPhone = phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
    console.log(`[AutoResponse] Sent to ${maskedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[AutoResponse] Exception:', error);
    return { success: false, error: 'Failed to send auto-response' };
  }
}

