import { z } from 'zod';

const emailSchema = z.string().trim().email().max(320);

export function readJsonObject(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  return body as Record<string, unknown>;
}

export function readEmail(body: Record<string, unknown>): string | null {
  const parsed = emailSchema.safeParse(body.email);
  return parsed.success ? parsed.data.toLowerCase() : null;
}

export function readPassword(body: Record<string, unknown>): string | null {
  if (typeof body.password !== 'string') return null;
  if (body.password.length === 0 || body.password.length > 200) return null;
  return body.password;
}
