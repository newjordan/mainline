import { z } from 'zod';

const mediaReferenceSchema = z.union([
  z.string().url(),
  z.string().startsWith('customer-media://'),
]);

export const messageSchema = z.object({
  customer_id: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound']),
  body: z.string().min(1, 'Message body cannot be empty'),
  media_urls: z.array(mediaReferenceSchema).optional().nullable(),
  twilio_sid: z.string().optional(),
  status: z
    .enum(['queued', 'sent', 'delivered', 'failed', 'undelivered'])
    .default('sent'),
});

export type MessageInput = z.infer<typeof messageSchema>;

export const sendMessageSchema = z.object({
  customer_id: z.string().uuid(),
  body: z.string().min(1, 'Message body cannot be empty'),
  media_urls: z.array(mediaReferenceSchema).optional().nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
