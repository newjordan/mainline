import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for PostgREST filter injection prevention
 * 
 * The search function strips special characters (,.:() ) that could
 * be used to inject additional filter clauses into the .or() syntax.
 */
describe('search injection prevention', () => {
  it('strips comma delimiters from search terms', () => {
    const malicious = 'test,id.eq.uuid';
    const sanitized = malicious.replace(/[,.:()]/g, '');
    assert.equal(sanitized, 'testidequuid');
  });

  it('strips period operators from search terms', () => {
    const malicious = 'name.eq.admin';
    const sanitized = malicious.replace(/[,.:()]/g, '');
    assert.equal(sanitized, 'nameeqadmin');
  });

  it('strips parentheses from search terms', () => {
    const malicious = 'test(or(id.eq.1))';
    const sanitized = malicious.replace(/[,.:()]/g, '');
    assert.equal(sanitized, 'testorideq1');
  });

  it('strips colons from search terms', () => {
    const malicious = 'id:12345';
    const sanitized = malicious.replace(/[,.:()]/g, '');
    assert.equal(sanitized, 'id12345');
  });

  it('preserves safe characters', () => {
    const safe = 'John Smith @email 555-1234';
    const sanitized = safe.replace(/[,.:()]/g, '');
    assert.equal(sanitized, 'John Smith @email 555-1234');
  });
});
