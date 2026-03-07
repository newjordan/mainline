const LOCALHOST_ORIGIN = 'http://localhost:3000';

function resolveOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return null;
  }
}

/**
 * Returns a stable public origin for Supabase auth redirects.
 * Prefers NEXT_PUBLIC_SITE_URL so links don't depend on the current host.
 */
export function getAuthRedirectOrigin(): string {
  const configuredOrigin = resolveOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return LOCALHOST_ORIGIN;
}

export function buildAuthRedirectUrl(pathname: string): string {
  return new URL(pathname, getAuthRedirectOrigin()).toString();
}
