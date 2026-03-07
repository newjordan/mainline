import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSafeNextPath } from '@/lib/safe-redirect';
import { shouldBlockSetupWizardPath } from '@/lib/setup-wizard/web-access';
import { mergeHardenedCookieOptions } from '@/lib/supabase/cookie-options';

/**
 * Route protection configuration
 *
 * Public paths: No authentication required
 * Auth paths: Authentication pages (login, sign-up, etc.)
 * Webhook paths: Signature-validated, no session auth
 * All other paths: Require authentication (dashboard routes)
 */
const PUBLIC_PATHS = [
  '/', // Landing page (public route group)
  '/payment-success', // Payment confirmation page
  '/privacy', // Privacy Policy page
  '/terms', // Terms of Service page
  '/sms-opt-in', // SMS opt-in CTA page
  '/api/auth/check-access', // Access-check endpoint (handles auth state itself)
];

const PUBLIC_PATH_PREFIXES = [
  '/q/', // Public quote view (token-based)
  '/api/cron/', // Cron jobs
];

const AUTH_PATH_PREFIX = '/auth';
const WEBHOOK_PATH_PREFIX = '/api/webhooks';

/**
 * Check if a path should skip authentication
 */
function isPublicPath(pathname: string): boolean {
  // Setup wizard stays public only in local/dev for first-time onboarding.
  if (pathname === '/setup-wizard') {
    return !shouldBlockSetupWizardPath(pathname);
  }

  // Exact match for public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  // Public path prefixes (quote view, cron, etc.)
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  // Auth routes (login, sign-up, forgot-password, etc.)
  if (pathname.startsWith(AUTH_PATH_PREFIX)) {
    return true;
  }

  // Webhook routes (Twilio, Square - use signature validation instead)
  if (pathname.startsWith(WEBHOOK_PATH_PREFIX)) {
    return true;
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              mergeHardenedCookieOptions(options)
            )
          );
        },
      },
    }
  );

  // Handle PKCE code exchange (for password reset, email confirmation, etc.)
  const code = request.nextUrl.searchParams.get('code');
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'));
  const authType = request.nextUrl.searchParams.get('type');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Code exchanged successfully - keep users on their intended destination.
      const url = request.nextUrl.clone();
      url.searchParams.delete('code');
      url.searchParams.delete('next');
      url.searchParams.delete('type');

      if (nextPath) {
        url.pathname = nextPath;
      } else if (authType === 'recovery') {
        // If a recovery link falls back to "/" (or any non-auth route),
        // force it into the password update screen.
        url.pathname = '/auth/update-password';
      }

      const redirectResponse = NextResponse.redirect(url);
      // IMPORTANT: Copy session cookies to redirect response
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }
    // If code exchange fails, continue normally (code may be expired/invalid)
  }

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: Always use getUser() to validate the session.
  // getSession() reads from cookies but doesn't validate with the server.
  // getUser() validates the JWT with Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Hard-stop web setup in production (local/dev only).
  if (shouldBlockSetupWizardPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // All other paths (dashboard routes) require authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
