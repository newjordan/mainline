import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { isAllowedEmail } from '@/lib/allowed-emails';

const originalAllowedEmails = process.env.ALLOWED_EMAILS;

afterEach(() => {
  if (originalAllowedEmails === undefined) {
    delete process.env.ALLOWED_EMAILS;
    return;
  }

  process.env.ALLOWED_EMAILS = originalAllowedEmails;
});

describe('isAllowedEmail', () => {
  it('allows matching email with case-insensitive comparison', () => {
    process.env.ALLOWED_EMAILS = 'Owner@Example.com';

    assert.equal(isAllowedEmail('owner@example.com'), true);
    assert.equal(isAllowedEmail('OWNER@EXAMPLE.COM'), true);
  });

  it('denies non-matching email', () => {
    process.env.ALLOWED_EMAILS = 'owner@example.com';

    assert.equal(isAllowedEmail('intruder@example.com'), false);
  });

  it('fails closed when ALLOWED_EMAILS is missing or empty', () => {
    delete process.env.ALLOWED_EMAILS;
    assert.equal(isAllowedEmail('owner@example.com'), false);

    process.env.ALLOWED_EMAILS = '   ';
    assert.equal(isAllowedEmail('owner@example.com'), false);
  });

  it('supports multiple emails in the allowlist', () => {
    process.env.ALLOWED_EMAILS =
      'owner@example.com, admin@example.com,team@example.com';

    assert.equal(isAllowedEmail('admin@example.com'), true);
    assert.equal(isAllowedEmail('team@example.com'), true);
    assert.equal(isAllowedEmail('other@example.com'), false);
  });
});
