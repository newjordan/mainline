import { z } from 'zod';

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 * Handles common US formats: (555) 123-4567, 555-123-4567, 5551234567, etc.
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If already has + prefix, return as-is
  if (phone.startsWith('+')) {
    return `+${digits}`;
  }

  // Return with + prefix
  return `+${digits}`;
}

export const customerSchema = z.object({
  phone_number: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .transform(normalizePhoneNumber)
    .refine(
      (val) => /^\+1\d{10}$/.test(val),
      'Please enter a valid US phone number'
    ),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(320, 'Email must be 320 characters or less')
    .optional(),
  name: z.string().optional(),
  address: z.string().max(500, 'Address must be 500 characters or less').optional(),
  additional_addresses: z
    .array(z.string().max(500, 'Address must be 500 characters or less'))
    .max(25, 'Maximum 25 additional addresses')
    .optional(),
  unit_info: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const customerUpdateSchema = customerSchema.partial();

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
