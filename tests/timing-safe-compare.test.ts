import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { timingSafeCompare } from '@/lib/timing-safe-compare';

describe('timingSafeCompare', () => {
  it('returns true for equal strings', () => {
    assert.equal(timingSafeCompare('secret123', 'secret123'), true);
  });

  it('returns false for different strings', () => {
    assert.equal(timingSafeCompare('secret123', 'secret456'), false);
  });

  it('returns false for different length strings', () => {
    assert.equal(timingSafeCompare('short', 'muchlonger'), false);
  });

  it('returns false for empty first string', () => {
    assert.equal(timingSafeCompare('', 'secret'), false);
  });

  it('returns false for empty second string', () => {
    assert.equal(timingSafeCompare('secret', ''), false);
  });

  it('returns false for both empty strings', () => {
    assert.equal(timingSafeCompare('', ''), false);
  });

  it('handles Bearer token format correctly', () => {
    const token = 'my-cron-secret';
    assert.equal(
      timingSafeCompare(`Bearer ${token}`, `Bearer ${token}`),
      true
    );
    assert.equal(
      timingSafeCompare(`Bearer ${token}`, `Bearer wrong`),
      false
    );
  });
});
