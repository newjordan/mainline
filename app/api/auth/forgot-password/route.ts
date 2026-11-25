import { NextRequest, NextResponse } from 'next/server';
import {
  SlidingWindowRateLimiter,
  createRateLimitKey,
  getClientIpFromHeaders,
} from '@/lib/rate-limit';
import { buildAuthRedirectUrl } from '@/lib/supabase/auth-redirect';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/allowed-emails';
import { readEmail, readJsonObject } from '@/lib/api/auth-request';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const limiter = new SlidingWindowRateLimiter({
  maxAttempts: 3,
  windowMs: FIFTEEN_MINUTES_MS,
});

const GENERIC_RESPONSE = {
  success: true,
  message: 'If that email is approved, a reset link is on the way.',
};

async function sendReset(email: string): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthRedirectUrl('/auth/update-password'),
  });
  return { error: error ? { message: error.message } : null };
}

const defaultForgotPasswordDeps = { sendReset };
let forgotPasswordDeps = { ...defaultForgotPasswordDeps };

export const __forgotPasswordTestUtils = {
  setSendReset(nextSendReset: typeof sendReset): void {
    forgotPasswordDeps = { sendReset: nextSendReset };
  },
  reset(): void {
    forgotPasswordDeps = { ...defaultForgotPasswordDeps };
  },
};

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

  const record = readJsonObject(body);
  const email = record ? readEmail(record) : null;

  if (!email) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // Same response for unknown and unapproved addresses so this route
  // cannot be used to enumerate accounts.
  if (!isAllowedEmail(email)) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    const { error } = await forgotPasswordDeps.sendReset(email);
    if (error) {
      console.error('[Auth Forgot Password API] Reset rejected');
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('[Auth Forgot Password API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
