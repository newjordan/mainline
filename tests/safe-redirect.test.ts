import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getSafeNextPath } from '@/lib/safe-redirect';

describe('getSafeNextPath', () => {
  it('allows valid relative paths', () => {
    assert.equal(getSafeNextPath('/customers'), '/customers');
  });

  it('rejects absolute URLs', () => {
    assert.equal(getSafeNextPath('https://evil.com'), null);
  });

  it('rejects protocol-relative URLs', () => {
    assert.equal(getSafeNextPath('//evil.com'), null);
  });

  it('rejects paths with query strings', () => {
    assert.equal(getSafeNextPath('/foo?bar=1'), null);
  });

  it('rejects paths with hashes', () => {
    assert.equal(getSafeNextPath('/foo#bar'), null);
  });

  it('rejects empty strings', () => {
    assert.equal(getSafeNextPath(''), null);
  });

  it('rejects null values', () => {
    assert.equal(getSafeNextPath(null), null);
  });
});
