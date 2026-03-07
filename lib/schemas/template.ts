import { z } from 'zod';

/**
 * Schema for creating/updating message templates
 * Used for form validation in admin UI (future)
 */
export const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be 100 characters or less'),
  body: z
    .string()
    .min(1, 'Template body is required')
    .max(1600, 'Template body must be 1600 characters or less'), // SMS segment limit
  is_active: z.boolean().default(true),
});

export type TemplateInput = z.infer<typeof templateSchema>;
