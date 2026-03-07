import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  __requireAdminSessionTestUtils,
  requireAdminSession,
} from '@/lib/require-admin-session';

const originalAllowedEmails = process.env.ALLOWED_EMAILS;
type CreateClientMock = Parameters<
  typeof __requireAdminSessionTestUtils.setCreateClient
>[0];

function mockAuthUserResponse(params: {
  user: { email?: string | null } | null;
  error?: unknown;
}): void {
  __requireAdminSessionTestUtils.setCreateClient(
    (async () =>
      ({
        auth: {
          getUser: async () => ({
            data: { user: params.user },
            error: params.error ?? null,
          }),
        },
      }) as unknown as Awaited<ReturnType<CreateClientMock>>) as CreateClientMock
  );
}

afterEach(() => {
  __requireAdminSessionTestUtils.resetCreateClient();

  if (originalAllowedEmails === undefined) {
    delete process.env.ALLOWED_EMAILS;
    return;
  }

  process.env.ALLOWED_EMAILS = originalAllowedEmails;
});

describe('requireAdminSession', () => {
  it('returns unauthorized when no user is authenticated', async () => {
    process.env.ALLOWED_EMAILS = 'admin@example.com';
    mockAuthUserResponse({ user: null });

    const result = await requireAdminSession();

    assert.deepEqual(result, { success: false, error: 'Unauthorized' });
  });

  it('returns unauthorized when authenticated user has no email', async () => {
    process.env.ALLOWED_EMAILS = 'admin@example.com';
    mockAuthUserResponse({ user: {} });

    const result = await requireAdminSession();

    assert.deepEqual(result, { success: false, error: 'Unauthorized' });
  });

  it('returns unauthorized when email is not in allowlist', async () => {
    process.env.ALLOWED_EMAILS = 'admin@example.com';
    mockAuthUserResponse({ user: { email: 'attacker@example.com' } });

    const result = await requireAdminSession();

    assert.deepEqual(result, { success: false, error: 'Unauthorized' });
  });
});
