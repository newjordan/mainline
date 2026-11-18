import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeHardenedCookieOptions } from '@/lib/supabase/cookie-options';

// NODE_ENV is typed as readonly once Next.js types are loaded, so tests
// mutate it through a writable view of the same object.
type WritableEnv = Record<string, string | undefined>;

function setNodeEnv(value: string | undefined) {
  const env = process.env as WritableEnv;

  if (value === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = value;
  }
}

function withNodeEnv(value: string | undefined, callback: () => void) {
  const previousNodeEnv = process.env.NODE_ENV;

  setNodeEnv(value);

  try {
    callback();
  } finally {
    setNodeEnv(previousNodeEnv);
  }
}

describe('cookie hardening', () => {
  it('always enforces httpOnly: true', () => {
    const merged = mergeHardenedCookieOptions({ httpOnly: false });

    assert.equal(merged.httpOnly, true);
  });

  it('sets secure: true in production', () => {
    withNodeEnv('production', () => {
      const merged = mergeHardenedCookieOptions({ secure: false });

      assert.equal(merged.secure, true);
    });
  });

  it('enforces sameSite: lax', () => {
    const merged = mergeHardenedCookieOptions({ sameSite: 'strict' });

    assert.equal(merged.sameSite, 'lax');
  });

  it('preserves existing options except hardened attributes', () => {
    const merged = mergeHardenedCookieOptions({
      domain: 'example.com',
      expires: new Date('2030-01-01T00:00:00.000Z'),
      maxAge: 3600,
      priority: 'high',
      path: '/custom-path',
      httpOnly: false,
      secure: false,
      sameSite: 'none',
    });

    assert.equal(merged.domain, 'example.com');
    assert.equal(merged.maxAge, 3600);
    assert.equal(merged.priority, 'high');
    assert.equal(merged.path, '/');
    assert.equal(merged.httpOnly, true);
    assert.equal(merged.secure, process.env.NODE_ENV === 'production');
    assert.equal(merged.sameSite, 'lax');
  });
});
