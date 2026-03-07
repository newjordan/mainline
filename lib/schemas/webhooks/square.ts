import { z } from 'zod';

export const squareEventTypes = ['payment.created', 'payment.updated'] as const;
export type SquareEventType = (typeof squareEventTypes)[number];

export const squarePaymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  order_id: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export type SquarePayment = z.infer<typeof squarePaymentSchema>;

export const squareWebhookEventSchema = z.object({
  event_id: z.string(),
  type: z.string(),
  created_at: z.string().optional(),
  merchant_id: z.string().optional(),
  data: z
    .object({
      type: z.string().optional(),
      id: z.string().optional(),
      object: z
        .object({
          payment: squarePaymentSchema.optional(),
        })
        .optional(),
    })
    .optional(),
});

export type SquareWebhookEvent = z.infer<typeof squareWebhookEventSchema>;

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isSquarePaymentEvent(type: string): type is SquareEventType {
  return type === 'payment.created' || type === 'payment.updated';
}

export function isSquarePaymentCompleted(payment: SquarePayment): boolean {
  return payment.status.toUpperCase() === 'COMPLETED';
}

export function extractInvoiceIdFromSquarePaymentNote(
  note: string | null | undefined
): string | null {
  if (!note) return null;

  const trimmed = note.trim();
  if (!trimmed) return null;

  if (z.string().uuid().safeParse(trimmed).success) {
    return trimmed;
  }

  const withoutPrefix = trimmed.replace(/^invoice:/i, '').trim();
  if (z.string().uuid().safeParse(withoutPrefix).success) {
    return withoutPrefix;
  }

  const match = trimmed.match(UUID_PATTERN);
  return match ? match[0] : null;
}
