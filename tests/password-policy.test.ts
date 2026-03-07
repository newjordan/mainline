import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validatePasswordPolicy } from '@/lib/password-policy';

describe('validatePasswordPolicy', () => {
  it('enforces minimum length', () => {
    const result = validatePasswordPolicy('Ab1!xyz');

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      'Password must be at least 8 characters long.',
    ]);
  });

  it('requires at least 1 uppercase letter', () => {
    const result = validatePasswordPolicy('abc123!@#');

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      'Password must include at least 1 uppercase letter.',
    ]);
  });

  it('requires at least 1 lowercase letter', () => {
    const result = validatePasswordPolicy('ABC123!@#');

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      'Password must include at least 1 lowercase letter.',
    ]);
  });

  it('requires at least 1 digit', () => {
    const result = validatePasswordPolicy('Abcdef!@#');

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      'Password must include at least 1 digit.',
    ]);
  });

  it('requires at least 1 special character', () => {
    const result = validatePasswordPolicy('Abcdef12');

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      'Password must include at least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?).',
    ]);
  });

  it('accepts a strong password', () => {
    const result = validatePasswordPolicy('StrongP@ssw0rd!');

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('reports multiple violations together', () => {
    const result = validatePasswordPolicy('abc');

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      'Password must be at least 8 characters long.',
      'Password must include at least 1 uppercase letter.',
      'Password must include at least 1 digit.',
      'Password must include at least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?).',
    ]);
  });
});
