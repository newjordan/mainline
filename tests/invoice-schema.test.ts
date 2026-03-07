import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceUpdateSchema } from '@/lib/schemas/invoice';

describe('invoice update schema', () => {
  it('does not inject a default status for partial updates', () => {
    const parsed = invoiceUpdateSchema.safeParse({ amount_cents: 12500 });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal('status' in parsed.data, false);
  });

  it('preserves an explicitly provided status', () => {
    const parsed = invoiceUpdateSchema.safeParse({ status: 'sent' });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal(parsed.data.status, 'sent');
  });
});
