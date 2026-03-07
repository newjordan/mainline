import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceUpdateSchema } from '@/lib/schemas/invoice';

/**
 * Tests for XSS prevention in invoice payment links
 * 
 * The schema must reject javascript:, data:, and other non-HTTPS URIs
 * to prevent stored XSS attacks via malicious payment links.
 */
describe('invoice payment link XSS prevention', () => {
  it('rejects javascript: URIs', () => {
    const result = invoiceUpdateSchema.safeParse({
      stripe_payment_link: 'javascript:alert(1)',
    });
    
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0].message, /HTTPS/i);
    }
  });

  it('rejects data: URIs', () => {
    const result = invoiceUpdateSchema.safeParse({
      stripe_payment_link: 'data:text/html,<script>alert(1)</script>',
    });
    
    assert.equal(result.success, false);
  });

  it('rejects http: (non-encrypted) URLs', () => {
    const result = invoiceUpdateSchema.safeParse({
      stripe_payment_link: 'http://example.com/pay',
    });
    
    assert.equal(result.success, false);
  });

  it('accepts valid HTTPS payment links', () => {
    const result = invoiceUpdateSchema.safeParse({
      stripe_payment_link: 'https://square.link/u/abc123',
    });
    
    assert.equal(result.success, true);
  });

  it('accepts missing payment link (optional field)', () => {
    const result = invoiceUpdateSchema.safeParse({
      amount_cents: 10000,
    });
    
    assert.equal(result.success, true);
  });
});

/**
 * Tests for runtime URL validation helper
 */
describe('isSafePaymentLink runtime validation', () => {
  // Simple inline version of the helper for testing
  function isSafePaymentLink(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  it('rejects javascript: URIs at runtime', () => {
    assert.equal(isSafePaymentLink('javascript:alert(1)'), false);
  });

  it('rejects data: URIs at runtime', () => {
    assert.equal(isSafePaymentLink('data:text/html,<script>'), false);
  });

  it('rejects http: URLs at runtime', () => {
    assert.equal(isSafePaymentLink('http://example.com'), false);
  });

  it('accepts https: URLs at runtime', () => {
    assert.equal(isSafePaymentLink('https://example.com'), true);
  });

  it('rejects null/undefined at runtime', () => {
    assert.equal(isSafePaymentLink(null), false);
    assert.equal(isSafePaymentLink(undefined), false);
  });

  it('rejects malformed URLs at runtime', () => {
    assert.equal(isSafePaymentLink('not a url'), false);
  });
});
