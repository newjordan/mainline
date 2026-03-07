import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInvoicePaymentNote,
  extractInvoiceRefToken,
  formatInvoiceShortRef,
} from '@/lib/utils/invoice-reference';

describe('invoice references', () => {
  it('formats invoice short refs with INV prefix', () => {
    assert.equal(
      formatInvoiceShortRef('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
      'INV-A1B2C3'
    );
  });

  it('builds payment note values for Square', () => {
    assert.equal(
      buildInvoicePaymentNote('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
      'invoice:a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    );
  });

  it('extracts short ref tokens from common search input', () => {
    assert.equal(extractInvoiceRefToken('INV-A1B2C3'), 'a1b2c3');
    assert.equal(extractInvoiceRefToken('inv:a1b2c3'), 'a1b2c3');
    assert.equal(
      extractInvoiceRefToken('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
      'a1b2c3'
    );
    assert.equal(extractInvoiceRefToken('Sarah'), null);
  });
});

