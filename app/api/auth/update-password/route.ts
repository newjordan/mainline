import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/allowed-emails';
import { validatePasswordPolicy } from '@/lib/password-policy';
import { readJsonObject, readPassword } from '@/lib/api/auth-request';

type SessionUser = { email: string | null } | null;

async function readSessionUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { email: user.email ?? null } : null;
}

async function updatePassword(password: string): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? { message: error.message } : null };
}

const defaultUpdatePasswordDeps = { readSessionUser, updatePassword };
let updatePasswordDeps = { ...defaultUpdatePasswordDeps };

export const __updatePasswordTestUtils = {
  setDeps(overrides: Partial<typeof defaultUpdatePasswordDeps>): void {
    updatePasswordDeps = { ...defaultUpdatePasswordDeps, ...overrides };
  },
  reset(): void {
    updatePasswordDeps = { ...defaultUpdatePasswordDeps };
  },
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const record = readJsonObject(body);
  const password = record ? readPassword(record) : null;
  if (!password) {
    return NextResponse.json({ error: 'Enter a new password.' }, { status: 400 });
  }

  const passwordValidation = validatePasswordPolicy(password);
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: passwordValidation.errors.join(' ') }, { status: 400 });
  }

  try {
    const user = await updatePasswordDeps.readSessionUser();
    if (!user?.email || !isAllowedEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await updatePasswordDeps.updatePassword(password);
    if (error) {
      console.error('[Auth Update Password API] Update rejected');
      return NextResponse.json(
        { error: 'Unable to update the password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Update Password API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
