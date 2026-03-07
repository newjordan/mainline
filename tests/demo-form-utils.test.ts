import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  centsToAmountInput,
  isAdjustmentNoteRequired,
  normalizeEditableLineItems,
  parseAmountToCents,
  sanitizeAmountInput,
  toEditableLineItems,
} from '@/lib/demo/demo-form-utils';

describe('demo form helpers', () => {
  it('sanitizes amount input and limits decimals', () => {
    assert.equal(sanitizeAmountInput('$12.345x'), '12.34');
    assert.equal(sanitizeAmountInput('-25.67'), '25.67');
    assert.equal(sanitizeAmountInput('-25.67', true), '-25.67');
  });

  it('formats and hydrates editable line items', () => {
    assert.equal(centsToAmountInput(12500), '125.00');
    assert.deepEqual(toEditableLineItems([{ description: 'Trip charge', amount_cents: 12500 }]), [
      { description: 'Trip charge', amount_input: '125.00' },
    ]);
  });

  it('parses amount inputs and detects when an adjustment note is required', () => {
    assert.equal(parseAmountToCents('278.10'), 27810);
    assert.equal(parseAmountToCents('oops'), 0);
    assert.equal(isAdjustmentNoteRequired(27800, 26800), true);
    assert.equal(isAdjustmentNoteRequired(26800, 26800), false);
    assert.equal(isAdjustmentNoteRequired(0, 26800), false);
  });

  it('filters blank and zero-value line items when normalizing', () => {
    assert.deepEqual(
      normalizeEditableLineItems([
        { description: 'Labor', amount_input: '120.00' },
        { description: 'Discount', amount_input: '-20.00' },
        { description: '  ', amount_input: '15.00' },
        { description: 'Ignored', amount_input: '0.00' },
      ]),
      [
        { description: 'Labor', amount_cents: 12000 },
        { description: 'Discount', amount_cents: -2000 },
      ]
    );
  });
});