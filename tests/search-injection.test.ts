import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchTerm } from '@/lib/documents/listing-utils';

/**
 * PostgREST `.or()` filters treat commas, dots, and parentheses as syntax.
 * Search terms are normalized before they are interpolated.
 */
describe('search injection prevention', () => {
  it('strips filter syntax from search terms', () => {
    assert.equal(normalizeSearchTerm('test,id.eq.uuid'), 'test id eq uuid');
    assert.equal(normalizeSearchTerm('name.eq.admin'), 'name eq admin');
    assert.equal(normalizeSearchTerm('test(or(id.eq.1))'), 'test or id eq 1');
    assert.equal(normalizeSearchTerm('id:12345'), 'id 12345');
  });

  it('preserves ordinary name and phone text', () => {
    assert.equal(normalizeSearchTerm('John Smith 555-1234'), 'John Smith 555-1234');
  });
});
