import { z } from 'zod';

// Twilio webhook payload for incoming SMS/MMS
// Twilio supports up to 10 media attachments per MMS (MediaUrl0-9)
export const twilioInboundMessageSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  NumMedia: z.coerce.number().default(0),
  // Media URLs (up to 10 per MMS)
  MediaUrl0: z.string().url().optional(),
  MediaUrl1: z.string().url().optional(),
  MediaUrl2: z.string().url().optional(),
  MediaUrl3: z.string().url().optional(),
  MediaUrl4: z.string().url().optional(),
  MediaUrl5: z.string().url().optional(),
  MediaUrl6: z.string().url().optional(),
  MediaUrl7: z.string().url().optional(),
  MediaUrl8: z.string().url().optional(),
  MediaUrl9: z.string().url().optional(),
  // Media content types
  MediaContentType0: z.string().optional(),
  MediaContentType1: z.string().optional(),
  MediaContentType2: z.string().optional(),
  MediaContentType3: z.string().optional(),
  MediaContentType4: z.string().optional(),
  MediaContentType5: z.string().optional(),
  MediaContentType6: z.string().optional(),
  MediaContentType7: z.string().optional(),
  MediaContentType8: z.string().optional(),
  MediaContentType9: z.string().optional(),
});

export type TwilioInboundMessage = z.infer<typeof twilioInboundMessageSchema>;

// Twilio webhook payload for message status updates
export const twilioStatusCallbackSchema = z.object({
  MessageSid: z.string(),
  // Twilio can emit a wider status set than our DB enum.
  // We accept any non-empty status string and normalize downstream.
  MessageStatus: z.string().min(1),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

export type TwilioStatusCallback = z.infer<typeof twilioStatusCallbackSchema>;
