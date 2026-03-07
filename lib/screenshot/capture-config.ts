export type CaptureMode = 'demo' | 'live';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export type LiveCaptureConfig = {
  adminEmail: string;
  adminPassword: string;
};

export function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;

  return (
    normalized.includes('your-project-id') ||
    normalized.includes('your-supabase') ||
    normalized.includes('example.com')
  );
}

export function resolveCaptureMode(env: NodeJS.ProcessEnv): CaptureMode {
  const explicitMode = (env.SCREENSHOT_CAPTURE_MODE ?? '').trim().toLowerCase();

  if (explicitMode === 'demo' || explicitMode === 'live') {
    return explicitMode;
  }

  if (explicitMode.length > 0) {
    throw new Error(
      `Invalid SCREENSHOT_CAPTURE_MODE="${explicitMode}". Use "demo" or "live".`
    );
  }

  return 'demo';
}

function parseAllowedEmails(env: NodeJS.ProcessEnv): string[] {
  return (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function resolveLiveCaptureConfig(env: NodeJS.ProcessEnv): LiveCaptureConfig {
  if (isPlaceholder(env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set to a real Supabase URL.');
  }

  if (isPlaceholder(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for live screenshot captures.');
  }

  if (isPlaceholder(env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set for live screenshot captures.');
  }

  if (!isTruthy(env.SCREENSHOT_ALLOW_LIVE_FIXTURE_MUTATION)) {
    throw new Error(
      'Live screenshot capture is disabled by default. Set SCREENSHOT_ALLOW_LIVE_FIXTURE_MUTATION=true to continue.'
    );
  }

  const adminEmail = (env.SCREENSHOT_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('SCREENSHOT_ADMIN_EMAIL is required for live screenshot captures.');
  }

  const adminPassword = (env.SCREENSHOT_ADMIN_PASSWORD ?? '').trim();
  if (!adminPassword) {
    throw new Error('SCREENSHOT_ADMIN_PASSWORD is required for live screenshot captures.');
  }

  const allowedEmails = parseAllowedEmails(env);
  if (!allowedEmails.includes(adminEmail)) {
    throw new Error('SCREENSHOT_ADMIN_EMAIL must also appear in ALLOWED_EMAILS.');
  }

  return {
    adminEmail,
    adminPassword,
  };
}

