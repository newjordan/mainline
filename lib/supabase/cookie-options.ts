import type { CookieOptions } from '@supabase/ssr';

export const HARDENED_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} as const;

export function getHardenedCookieOptions(): CookieOptions {
  return {
    ...HARDENED_COOKIE_BASE_OPTIONS,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function mergeHardenedCookieOptions(
  options: CookieOptions | undefined
): CookieOptions {
  return {
    ...(options ?? {}),
    ...getHardenedCookieOptions(),
  };
}
