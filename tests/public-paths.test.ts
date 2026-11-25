import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isPublicPath } from '@/lib/supabase/public-paths';

describe('route auth boundaries', () => {
  it('allows credential APIs before a session exists', () => {
    assert.equal(isPublicPath('/api/auth/login'), true);
    assert.equal(isPublicPath('/api/auth/sign-up'), true);
    assert.equal(isPublicPath('/api/auth/forgot-password'), true);
  });

  it('keeps password changes and dashboard data behind a session', () => {
    assert.equal(isPublicPath('/api/auth/update-password'), false);
    assert.equal(isPublicPath('/customers'), false);
    assert.equal(isPublicPath('/api/auth/check-access'), true);
  });

  it('leaves signature-checked webhooks and secret-checked cron routes unsigned by session auth', () => {
    assert.equal(isPublicPath('/api/webhooks/twilio'), true);
    assert.equal(isPublicPath('/api/cron/payment-reminders'), true);
  });
});
