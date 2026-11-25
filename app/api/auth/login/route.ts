import { NextRequest, NextResponse } from 'next/server';
import {
  SlidingWindowRateLimiter,
  createRateLimitKey,
  getClientIpFromHeaders,
} from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { readEmail, readJsonObject, readPassword } from '@/lib/api/auth-request';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const limiter = new SlidingWindowRateLimiter({
  maxAttempts: 5,
  windowMs: FIFTEEN_MINUTES_MS,
});

type SignInResult = { error: { message: string } | null };

async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? { message: error.message } : null };
}

const defaultLoginDeps = { signInWithPassword };
let loginDeps = { ...defaultLoginDeps };

export const __loginTestUtils = {
  setSignIn(signIn: typeof signInWithPassword): void {
    loginDeps = { signInWithPassword: signIn };
  },
  reset(): void {
    loginDeps = { ...defaultLoginDeps };
  },
};

function createRateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many login attempts. Please try again later.' },
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

  try {
    const { error } = await loginDeps.signInWithPassword(email, password);

    if (error) {
      // Do not forward provider errors. They can distinguish unknown
      // accounts from bad passwords.
      console.error('[Auth Login API] Sign-in rejected');
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Login API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
