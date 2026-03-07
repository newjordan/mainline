const TRUTHY = new Set(['1', 'true', 'yes', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'off']);

function normalizeFlag(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;

  return (
    normalized.includes('your-project-id') ||
    normalized.includes('your-supabase') ||
    normalized.includes('example.com')
  );
}

function hasConfiguredSupabaseEnv(): boolean {
  return (
    !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function hasConfiguredPublicEnv(): boolean {
  return (
    !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !isPlaceholder(process.env.NEXT_PUBLIC_SITE_URL)
  );
}

function getDemoModeFlag(): string | null {
  return normalizeFlag(process.env.NEXT_PUBLIC_DEMO_MODE) ?? normalizeFlag(process.env.DEMO_MODE);
}

/**
 * Demo Mode activation rules:
 * - Explicit `NEXT_PUBLIC_DEMO_MODE` or `DEMO_MODE` true always enables.
 * - Explicit `NEXT_PUBLIC_DEMO_MODE` or `DEMO_MODE` false always disables.
 * - In the browser, fall back to demo mode when required public env is absent.
 *   This keeps demo deployments working even though `DEMO_MODE` itself is server-only.
 * - Otherwise in development only, auto-enable when Supabase env is not fully configured.
 */
export function isDemoModeEnabled(): boolean {
  const rawFlag = getDemoModeFlag();

  if (rawFlag && TRUTHY.has(rawFlag)) return true;
  if (rawFlag && FALSY.has(rawFlag)) return false;

  if (typeof window !== 'undefined') return !hasConfiguredPublicEnv();

  if (process.env.NODE_ENV !== 'development') return false;
  return !hasConfiguredSupabaseEnv();
}

export const demoModeEnabled = isDemoModeEnabled();
