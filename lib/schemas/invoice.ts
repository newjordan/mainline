import { z } from 'zod';

const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue']);

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1),
  amount_cents: z
    .number()
    .int()
    .refine((value) => value !== 0, 'Line item amount must be non-zero'),
});

export const invoiceSchema = z.object({
  quote_id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  adjustment_note: z.string().trim().max(1000).nullable().optional(),
  job_description: z.string().trim().max(2000).nullable().optional(),
  line_items: z.array(invoiceLineItemSchema).optional(),
  service_address: z.string().trim().max(500).nullable().optional(),
  status: invoiceStatusSchema.default('draft'),
  stripe_payment_link: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), {
      message: 'Payment link must use HTTPS protocol',
    })
    .optional(),
  stripe_payment_id: z.string().optional(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const invoiceUpdateSchema = invoiceSchema
  .partial()
  .omit({ customer_id: true, quote_id: true })
  .extend({
    // Updates should only include status when explicitly requested.
    status: invoiceStatusSchema.optional(),
  });

export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
