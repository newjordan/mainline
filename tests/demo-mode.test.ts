import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { isDemoModeEnabled } from '@/lib/demo-mode';

const originalEnv = {
  DEMO_MODE: process.env.DEMO_MODE,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV: process.env.NODE_ENV,
};

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

function setWindow(value: object | undefined) {
  if (value === undefined) {
    delete (globalThis as { window?: object }).window;
    return;
  }

  Object.defineProperty(globalThis, 'window', {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    delete (globalThis as { window?: object }).window;
  }
});

describe('isDemoModeEnabled', () => {
  it('enables demo mode from an explicit server flag', () => {
    setWindow(undefined);
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';

    assert.equal(isDemoModeEnabled(), true);
  });

  it('enables demo mode from an explicit public flag in the browser', () => {
    setWindow({ location: { pathname: '/demo/login' } });
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

    assert.equal(isDemoModeEnabled(), true);
  });

  it('falls back to demo mode in the browser when public env is missing', () => {
    setWindow({ location: { pathname: '/demo/login' } });
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    assert.equal(isDemoModeEnabled(), true);
  });

  it('does not silently enable demo mode on the server in production', () => {
    setWindow(undefined);
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    assert.equal(isDemoModeEnabled(), false);
  });
});