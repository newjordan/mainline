import { NextRequest, NextResponse } from 'next/server';
import {
  SlidingWindowRateLimiter,
  createRateLimitKey,
  getClientIpFromHeaders,
} from '@/lib/rate-limit';
import { buildAuthRedirectUrl } from '@/lib/supabase/auth-redirect';
import { createClient } from '@/lib/supabase/server';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const limiter = new SlidingWindowRateLimiter({
  maxAttempts: 3,
  windowMs: FIFTEEN_MINUTES_MS,
});

function createRateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many password reset attempts. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIpFromHeaders(request.headers);
  const key = createRateLimitKey(ip, request.nextUrl.pathname);
  const rateLimitResult = limiter.check(key);

  if (!rateLimitResult.allowed) {
    return createRateLimitedResponse(rateLimitResult.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String(body.email).trim()
      : '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthRedirectUrl('/auth/update-password'),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Forgot Password API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
