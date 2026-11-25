import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedEmail } from '@/lib/allowed-emails';
import { ensureAdminAllowlist } from '@/lib/server/admin-allowlist';
import { getSafeNextPath } from '@/lib/safe-redirect';
import { shouldBlockSetupWizardPath } from '@/lib/setup-wizard/web-access';
import { mergeHardenedCookieOptions } from '@/lib/supabase/cookie-options';
import { isPublicPath } from '@/lib/supabase/public-paths';

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
        setAll(cookiesToSet, headers) {
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
          // Auth cookies must never be cached by CDNs or proxies, or one
          // user's session token can be served to another user.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
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
      // Copy the no-cache headers too, so a cached redirect can't leak the
      // freshly exchanged session to another user.
      for (const header of ['cache-control', 'expires', 'pragma']) {
        const value = supabaseResponse.headers.get(header);
        if (value) redirectResponse.headers.set(header, value);
      }
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

  if (user?.email && isAllowedEmail(user.email)) {
    await ensureAdminAllowlist(user.email);
  }

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
