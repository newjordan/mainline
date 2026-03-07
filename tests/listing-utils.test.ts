import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeInvoiceSavedView,
  normalizeInvoiceStatusFilter,
  normalizeListLimit,
  normalizeQuoteSavedView,
  normalizeQuoteStatusFilter,
  normalizeSearchTerm,
  sortByLabel,
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
} from '@/lib/documents/listing-utils';

describe('listing filter normalization', () => {
  it('maps legacy quote filters to saved views', () => {
    assert.equal(normalizeQuoteSavedView(undefined, 'pending'), 'needs-follow-up');
    assert.equal(normalizeQuoteSavedView(undefined, 'completed'), 'recently-completed');
    assert.equal(normalizeQuoteSavedView(undefined, 'archived'), 'archived');
    assert.equal(normalizeQuoteSavedView(undefined, 'active'), 'all');
  });

  it('maps legacy invoice filters to saved views and status', () => {
    assert.equal(
      normalizeInvoiceSavedView(undefined, 'outstanding'),
      'awaiting-payment'
    );
    assert.equal(
      normalizeInvoiceSavedView(undefined, 'completed'),
      'recently-completed'
    );
    assert.equal(normalizeInvoiceStatusFilter(undefined, 'paid'), 'paid');
    assert.equal(normalizeInvoiceStatusFilter(undefined, 'active'), 'any');
  });

  it('keeps explicit status filters when valid', () => {
    assert.equal(normalizeQuoteStatusFilter('accepted'), 'accepted');
    assert.equal(normalizeQuoteStatusFilter('bogus'), 'any');
    assert.equal(normalizeInvoiceStatusFilter('overdue'), 'overdue');
    assert.equal(normalizeInvoiceStatusFilter('bogus'), 'any');
  });
});

describe('listing helpers', () => {
  it('normalizes search terms safely', () => {
    assert.equal(normalizeSearchTerm('  Abc%123,()  '), 'Abc 123');
    assert.equal(normalizeSearchTerm(''), '');
  });

  it('normalizes list limits to safe bounds', () => {
    assert.equal(normalizeListLimit(undefined), DEFAULT_LIST_LIMIT);
    assert.equal(normalizeListLimit('10'), DEFAULT_LIST_LIMIT);
    assert.equal(normalizeListLimit('80'), 80);
    assert.equal(normalizeListLimit(String(MAX_LIST_LIMIT + 100)), MAX_LIST_LIMIT);
  });

  it('sorts groups by label for consistent grouping', () => {
    const sorted = sortByLabel([
      { label: 'Zulu', id: '3' },
      { label: 'Alpha', id: '1' },
      { label: 'Mike', id: '2' },
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ['1', '2', '3']
    );
  });
});
