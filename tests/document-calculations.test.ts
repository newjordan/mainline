import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateDocumentTotals,
  calculateTaxCents,
  dollarsToCents,
  parseAmountToCents,
  roundHalfAwayFromZero,
} from '@/lib/documents/calculations';

describe('money rounding', () => {
  it('rounds half away from zero', () => {
    assert.equal(roundHalfAwayFromZero(1.5), 2);
    assert.equal(roundHalfAwayFromZero(-1.5), -2);
    assert.equal(roundHalfAwayFromZero(1.4), 1);
  });

  it('converts dollar amounts that binary floats round the wrong way', () => {
    assert.equal(dollarsToCents(1.005), 101);
    assert.equal(dollarsToCents(10.005), 1001);
    assert.equal(dollarsToCents(1.015), 102);
    assert.equal(dollarsToCents(-1.005), -101);
  });

  it('converts ordinary currency amounts and sums of tenths', () => {
    assert.equal(dollarsToCents(19.99), 1999);
    assert.equal(dollarsToCents(10.1), 1010);
    assert.equal(dollarsToCents(0.1 + 0.2), 30);
    assert.equal(parseAmountToCents('278.10'), 27810);
    assert.equal(parseAmountToCents('oops'), 0);
    assert.equal(parseAmountToCents('-20.00'), -2000);
  });
});

describe('quote and invoice totals', () => {
  const lineItems = [
    { description: 'Diagnostic', amount_cents: 12500 },
    { description: 'Labor', amount_cents: 12000 },
    { description: 'Discount', amount_cents: -500 },
  ];

  it('sums line items with no tax', () => {
    const totals = calculateDocumentTotals(lineItems, 0);

    assert.equal(totals.subtotalCents, 24000);
    assert.equal(totals.taxCents, 0);
    assert.equal(totals.totalCents, 24000);
  });

  it('applies tax once to the subtotal and rounds half up', () => {
    assert.equal(calculateTaxCents(1000, 825), 83);
    assert.equal(calculateTaxCents(10, 825), 1);
    assert.equal(calculateTaxCents(6, 825), 0);
    assert.equal(calculateTaxCents(-1000, 825), -83);

    const totals = calculateDocumentTotals(
      [
        { amount_cents: 1000 },
        { amount_cents: 250 },
      ],
      825
    );

    assert.equal(totals.subtotalCents, 1250);
    assert.equal(totals.taxCents, 103);
    assert.equal(totals.totalCents, 1353);
  });

  it('rejects a tax rate outside 0 to 100 percent', () => {
    assert.throws(() => calculateTaxCents(100, 10001), /basis points/);
    assert.throws(() => calculateTaxCents(100, -1), /basis points/);
  });

  it('rejects non-integer line amounts', () => {
    assert.throws(
      () => calculateDocumentTotals([{ amount_cents: 10.5 }], 0),
      /integer cents/
    );
  });
});
