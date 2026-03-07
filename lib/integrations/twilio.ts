import twilio from 'twilio';
import { validateTwilioEnv } from '@/lib/env';
import type { ActionResult } from '@/types';
import type { TwilioStatusCallback } from '@/lib/schemas/webhooks/twilio';
import { getBusinessProfile } from '@/lib/config/business-profile';

// Lazy-loaded Twilio client (initialized on first use)
let twilioClient: twilio.Twilio | null = null;
let twilioEnv: ReturnType<typeof validateTwilioEnv> | null = null;

const DEFAULT_SITE_URL = getBusinessProfile().defaults.websiteUrl;
const E164_REGEX = /^\+\d{10,15}$/;

/**
 * Gets or creates the Twilio client
 * Validates environment variables on first call
 */
function getClient(): twilio.Twilio {
  if (!twilioClient) {
    twilioEnv = validateTwilioEnv();
    twilioClient = twilio(twilioEnv.TWILIO_ACCOUNT_SID, twilioEnv.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Gets the validated Twilio phone number
 */
function getFromNumber(): string {
  if (!twilioEnv) {
    twilioEnv = validateTwilioEnv();
  }
  return twilioEnv.TWILIO_PHONE_NUMBER;
}

/**
 * Builds the status callback URL used for outbound message delivery updates.
 */
function getStatusCallbackUrl(): string {
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  try {
    return new URL('/api/webhooks/twilio/status', rawBaseUrl).toString();
  } catch {
    return `${DEFAULT_SITE_URL}/api/webhooks/twilio/status`;
  }
}

/**
 * Normalize phone input to E.164 for Twilio sends.
 * This protects invoice sends when older customer data is stored in display format.
 */
function normalizeToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (phone.startsWith('+')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function getTwilioErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown Twilio error';
  }

  if (error.message === 'Missing or invalid Twilio configuration') {
    return 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.';
  }

  const maybeCode = (error as { code?: string | number }).code;
  if (maybeCode) {
    return `[${maybeCode}] ${error.message}`;
  }

  return error.message;
}

/**
 * Sends an SMS message via Twilio
 * @param to - Recipient phone number in E.164 format
 * @param body - Message text content
 * @returns ActionResult with message SID on success
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<ActionResult<string>> {
  const normalizedTo = normalizeToE164(to);
  if (!E164_REGEX.test(normalizedTo)) {
    return { success: false, error: 'Recipient phone number is invalid (must be E.164 format).' };
  }

  try {
    const client = getClient();
    const message = await client.messages.create({
      body,
      from: getFromNumber(),
      to: normalizedTo,
      statusCallback: getStatusCallbackUrl(),
    });

    console.log(`[Twilio] SMS sent to ${normalizedTo}, SID: ${message.sid}`);
    return { success: true, data: message.sid };
  } catch (error) {
    const errorMessage = getTwilioErrorMessage(error);
    console.error(`[Twilio] SMS error to ${normalizedTo}:`, errorMessage);
    return { success: false, error: `Failed to send SMS message: ${errorMessage}` };
  }
}

/**
 * Sends an MMS message with media via Twilio
 * @param to - Recipient phone number in E.164 format
 * @param body - Message text content
 * @param mediaUrl - URL of media to attach (must be publicly accessible)
 * @returns ActionResult with message SID on success
 */
export async function sendMMS(
  to: string,
  body: string,
  mediaUrl: string
): Promise<ActionResult<string>> {
  const normalizedTo = normalizeToE164(to);
  if (!E164_REGEX.test(normalizedTo)) {
    return { success: false, error: 'Recipient phone number is invalid (must be E.164 format).' };
  }

  try {
    const client = getClient();
    const message = await client.messages.create({
      body,
      from: getFromNumber(),
      to: normalizedTo,
      mediaUrl: [mediaUrl],
      statusCallback: getStatusCallbackUrl(),
    });

    console.log(`[Twilio] MMS sent to ${normalizedTo}, SID: ${message.sid}`);
    return { success: true, data: message.sid };
  } catch (error) {
    const errorMessage = getTwilioErrorMessage(error);
    console.error(`[Twilio] MMS error to ${normalizedTo}:`, errorMessage);
    return { success: false, error: `Failed to send MMS message: ${errorMessage}` };
  }
}

/**
 * Sends a message with optional multiple media attachments
 * @param to - Recipient phone number in E.164 format
 * @param body - Message text content
 * @param mediaUrls - Optional array of media URLs
 * @returns ActionResult with message SID on success
 */
export async function sendMessage(
  to: string,
  body: string,
  mediaUrls?: string[]
): Promise<ActionResult<string>> {
  const normalizedTo = normalizeToE164(to);
  if (!E164_REGEX.test(normalizedTo)) {
    return { success: false, error: 'Recipient phone number is invalid (must be E.164 format).' };
  }

  try {
    const client = getClient();
    const message = await client.messages.create({
      body,
      from: getFromNumber(),
      to: normalizedTo,
      statusCallback: getStatusCallbackUrl(),
      ...(mediaUrls && mediaUrls.length > 0 && { mediaUrl: mediaUrls }),
    });

    console.log(`[Twilio] Message sent to ${normalizedTo}, SID: ${message.sid}`);
    return { success: true, data: message.sid };
  } catch (error) {
    const errorMessage = getTwilioErrorMessage(error);
    console.error(`[Twilio] Message error to ${normalizedTo}:`, errorMessage);
    return { success: false, error: `Failed to send message: ${errorMessage}` };
  }
}

/**
 * Validates a Twilio webhook request signature
 * MUST be called before processing any webhook to prevent spoofing
 *
 * @param signature - X-Twilio-Signature header value
 * @param url - Full webhook URL including protocol
 * @param params - Request body parameters as key-value pairs
 * @returns true if signature is valid, false otherwise
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  try {
    if (!twilioEnv) {
      twilioEnv = validateTwilioEnv();
    }

    const isValid = twilio.validateRequest(
      twilioEnv.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );

    if (!isValid) {
      console.warn('[Twilio] Invalid webhook signature');
    }

    return isValid;
  } catch (error) {
    console.error('[Twilio] Signature validation error:', error);
    return false;
  }
}

/**
 * Type for Twilio message status values (derived from Zod schema)
 */
export type TwilioMessageStatus = TwilioStatusCallback['MessageStatus'];
