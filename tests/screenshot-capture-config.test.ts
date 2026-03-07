import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isPlaceholder,
  resolveCaptureMode,
  resolveLiveCaptureConfig,
} from '../lib/screenshot/capture-config.ts';

describe('resolveCaptureMode', () => {
  it('defaults to demo mode when SCREENSHOT_CAPTURE_MODE is unset', () => {
    assert.equal(resolveCaptureMode({}), 'demo');
  });

  it('accepts an explicit live mode override', () => {
    assert.equal(resolveCaptureMode({ SCREENSHOT_CAPTURE_MODE: 'live' }), 'live');
  });

  it('rejects invalid mode values', () => {
    assert.throws(
      () => resolveCaptureMode({ SCREENSHOT_CAPTURE_MODE: 'staging' }),
      /Invalid SCREENSHOT_CAPTURE_MODE/
    );
  });
});

describe('resolveLiveCaptureConfig', () => {
  const baseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    SCREENSHOT_ALLOW_LIVE_FIXTURE_MUTATION: 'true',
    SCREENSHOT_ADMIN_EMAIL: 'shots@example.com',
    SCREENSHOT_ADMIN_PASSWORD: 'correct horse battery staple',
    ALLOWED_EMAILS: 'shots@example.com,owner@example.com',
  };

  it('rejects placeholder Supabase configuration', () => {
    assert.equal(isPlaceholder('https://example.com'), true);
    assert.throws(
      () =>
        resolveLiveCaptureConfig({
          ...baseEnv,
          NEXT_PUBLIC_SUPABASE_URL: 'https://your-project-id.supabase.co',
        }),
      /NEXT_PUBLIC_SUPABASE_URL/
    );
  });

  it('requires explicit mutation opt-in', () => {
    assert.throws(
      () =>
        resolveLiveCaptureConfig({
          ...baseEnv,
          SCREENSHOT_ALLOW_LIVE_FIXTURE_MUTATION: 'false',
        }),
      /SCREENSHOT_ALLOW_LIVE_FIXTURE_MUTATION=true/
    );
  });

  it('requires an allowlisted screenshot admin email and password', () => {
    assert.throws(
      () => resolveLiveCaptureConfig({ ...baseEnv, SCREENSHOT_ADMIN_PASSWORD: '' }),
      /SCREENSHOT_ADMIN_PASSWORD/
    );

    assert.throws(
      () =>
        resolveLiveCaptureConfig({
          ...baseEnv,
          SCREENSHOT_ADMIN_EMAIL: 'other@example.com',
        }),
      /ALLOWED_EMAILS/
    );
  });

  it('returns explicit live credentials when configuration is safe', () => {
    assert.deepEqual(resolveLiveCaptureConfig(baseEnv), {
      adminEmail: 'shots@example.com',
      adminPassword: 'correct horse battery staple',
    });
  });
});

