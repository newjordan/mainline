export interface SlidingWindowRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const UNKNOWN_IP = 'unknown';
const CLEANUP_INTERVAL = 100;

export class SlidingWindowRateLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly attempts = new Map<string, number[]>();
  private checksSinceCleanup = 0;

  constructor(options: SlidingWindowRateLimitOptions) {
    if (options.maxAttempts <= 0) {
      throw new Error('maxAttempts must be greater than 0');
    }

    if (options.windowMs <= 0) {
      throw new Error('windowMs must be greater than 0');
    }

    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  check(key: string): RateLimitCheckResult {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const existingAttempts = this.attempts.get(key) ?? [];
    const recentAttempts = existingAttempts.filter(
      (timestamp) => timestamp > windowStart
    );

    this.checksSinceCleanup++;
    if (this.checksSinceCleanup >= CLEANUP_INTERVAL) {
      this.pruneExpiredKeys(windowStart);
      this.checksSinceCleanup = 0;
    }

    if (recentAttempts.length >= this.maxAttempts) {
      this.attempts.set(key, recentAttempts);
      const retryAfterMs = Math.max(
        0,
        recentAttempts[0] + this.windowMs - now
      );

      return {
        allowed: false,
        limit: this.maxAttempts,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return {
      allowed: true,
      limit: this.maxAttempts,
      remaining: Math.max(0, this.maxAttempts - recentAttempts.length),
      retryAfterSeconds: 0,
    };
  }

  clear(key?: string) {
    if (key) {
      this.attempts.delete(key);
      return;
    }

    this.attempts.clear();
  }

  private pruneExpiredKeys(windowStart: number) {
    for (const [key, attempts] of this.attempts) {
      const recentAttempts = attempts.filter((timestamp) => timestamp > windowStart);
      if (recentAttempts.length === 0) {
        this.attempts.delete(key);
      } else if (recentAttempts.length !== attempts.length) {
        this.attempts.set(key, recentAttempts);
      }
    }
  }
}

export function getClientIpFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  return UNKNOWN_IP;
}

export function createRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`;
}
