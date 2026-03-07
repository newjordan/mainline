import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true only when both strings are non-empty and equal.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Compare against self to keep timing constant, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
