import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getTaxRateBps } from '@/lib/config/business-profile';
import { getDemoInvoices, getDemoQuotes } from '@/lib/demo/demo-data';
import { calculateDocumentTotals } from '@/lib/documents/calculations';

describe('seeded demo documents', () => {
  const taxRateBps = getTaxRateBps();

  it('stores quote totals that match line items and tax', () => {
    for (const quote of getDemoQuotes()) {
      const totals = calculateDocumentTotals(quote.line_items, taxRateBps);
      assert.equal(
        quote.total_cents,
        totals.totalCents,
        `${quote.id} total should include tax`
      );
    }
  });

  it('stores invoice totals that match line items and tax unless an adjustment is noted', () => {
    for (const invoice of getDemoInvoices()) {
      if (invoice.line_items.length === 0 || invoice.adjustment_note) continue;
      const totals = calculateDocumentTotals(invoice.line_items, taxRateBps);
      assert.equal(
        invoice.amount_cents,
        totals.totalCents,
        `${invoice.id} total should include tax`
      );
    }
  });
});
