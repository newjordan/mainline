import { z } from 'zod';

export const quoteLineItemSchema = z.object({
  description: z.string().min(1),
  amount_cents: z
    .number()
    .int()
    .refine((value) => value !== 0, 'Line item amount must be non-zero'),
});

export type QuoteLineItemInput = z.infer<typeof quoteLineItemSchema>;

export const quoteSchema = z.object({
  customer_id: z.string().uuid(),
  description: z.string().min(1, 'Quote description is required'),
  service_address: z
    .string()
    .max(500, 'Service address must be 500 characters or less')
    .optional(),
  line_items: z
    .array(quoteLineItemSchema)
    .min(1, 'At least one line item required'),
  total_cents: z.number().int().positive(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).default('draft'),
  google_doc_url: z.string().url().optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

export const quoteUpdateSchema = quoteSchema
  .partial()
  .omit({ customer_id: true });

export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
