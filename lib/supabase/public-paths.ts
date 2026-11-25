import { shouldBlockSetupWizardPath } from '@/lib/setup-wizard/web-access';

const PUBLIC_PATHS = [
  '/',
  '/payment-success',
  '/privacy',
  '/terms',
  '/sms-opt-in',
  '/api/auth/check-access',
  '/api/auth/login',
  '/api/auth/sign-up',
  '/api/auth/forgot-password',
];

const PUBLIC_PATH_PREFIXES = ['/q/', '/api/cron/'];

const AUTH_PATH_PREFIX = '/auth';
const WEBHOOK_PATH_PREFIX = '/api/webhooks';

/**
 * Paths that do not require a dashboard session.
 * Credential APIs are public because they create the session. They still
 * validate input and rate-limit themselves.
 */
export function isPublicPath(pathname: string): boolean {
  if (pathname === '/setup-wizard') {
    return !shouldBlockSetupWizardPath(pathname);
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  if (pathname.startsWith(AUTH_PATH_PREFIX)) {
    return true;
  }

  if (pathname.startsWith(WEBHOOK_PATH_PREFIX)) {
    return true;
  }

  return false;
}
