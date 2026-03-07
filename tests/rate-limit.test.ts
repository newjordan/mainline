import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit';

describe('SlidingWindowRateLimiter', () => {
  it('allows attempts up to the limit and blocks the next one', () => {
    const now = 0;
    const limiter = new SlidingWindowRateLimiter({
      maxAttempts: 3,
      windowMs: 1000,
      now: () => now,
    });
    const key = '127.0.0.1:/api/auth/login';

    assert.equal(limiter.check(key).allowed, true);
    assert.equal(limiter.check(key).allowed, true);
    assert.equal(limiter.check(key).allowed, true);

    const blocked = limiter.check(key);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.retryAfterSeconds, 1);
  });

  it('allows new attempts once the window has passed', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({
      maxAttempts: 3,
      windowMs: 1000,
      now: () => now,
    });
    const key = '127.0.0.1:/api/auth/sign-up';

    limiter.check(key); // t=0
    now = 200;
    limiter.check(key); // t=200
    now = 400;
    limiter.check(key); // t=400

    now = 800;
    assert.equal(limiter.check(key).allowed, false);

    now = 1001;
    const afterWindow = limiter.check(key);
    assert.equal(afterWindow.allowed, true);
    assert.equal(afterWindow.remaining, 0);
  });
});
