import { NextRequest, NextResponse } from 'next/server';
import {
  SlidingWindowRateLimiter,
  createRateLimitKey,
  getClientIpFromHeaders,
} from '@/lib/rate-limit';
import { buildAuthRedirectUrl } from '@/lib/supabase/auth-redirect';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/allowed-emails';
import { validatePasswordPolicy } from '@/lib/password-policy';
import { readEmail, readJsonObject, readPassword } from '@/lib/api/auth-request';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const limiter = new SlidingWindowRateLimiter({
  maxAttempts: 3,
  windowMs: FIFTEEN_MINUTES_MS,
});

type SignUpResult = { error: { message: string } | null };

async function signUp(email: string, password: string): Promise<SignUpResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthRedirectUrl('/customers'),
    },
  });
  return { error: error ? { message: error.message } : null };
}

const defaultSignUpDeps = { signUp };
let signUpDeps = { ...defaultSignUpDeps };

export const __signUpTestUtils = {
  setSignUp(nextSignUp: typeof signUp): void {
    signUpDeps = { signUp: nextSignUp };
  },
  reset(): void {
    signUpDeps = { ...defaultSignUpDeps };
  },
};

function createRateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many sign-up attempts. Please try again later.' },
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
  const password = record ? readPassword(record) : null;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Enter a valid email and password.' },
      { status: 400 }
    );
  }

  const passwordValidation = validatePasswordPolicy(password);
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: passwordValidation.errors.join(' ') }, { status: 400 });
  }

  // Open sign-up plus permissive database policies would let any account
  // read customer data. Only approved emails may create an account.
  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      { error: 'Sign-up is limited to approved email addresses.' },
      { status: 403 }
    );
  }

  try {
    const { error } = await signUpDeps.signUp(email, password);

    if (error) {
      console.error('[Auth Sign-up API] Sign-up rejected');
      return NextResponse.json(
        { error: 'Unable to create an account with those details.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Sign-up API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
