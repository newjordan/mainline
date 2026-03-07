import { NextResponse } from 'next/server';
import { isAllowedEmail } from '@/lib/allowed-emails';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { allowed: false, reason: 'Not authenticated.' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { allowed: false, reason: 'Authenticated user has no email address.' },
        { status: 403 }
      );
    }

    if (!isAllowedEmail(user.email)) {
      return NextResponse.json(
        { allowed: false, reason: 'Email is not authorized for dashboard access.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('[Auth Check Access] Failed to validate allowlist access', error);
    return NextResponse.json(
      { allowed: false, reason: 'Internal server error.' },
      { status: 500 }
    );
  }
}
