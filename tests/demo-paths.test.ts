import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEMO_CUSTOMERS_PATH,
  DEMO_SEARCH_PATH,
  buildDemoCustomersHref,
  buildDemoInvoiceDocumentPath,
  buildDemoInvoicesHref,
  buildDemoNewCustomerPath,
  buildDemoNewInvoicePath,
  buildDemoNewQuotePath,
  buildDemoQuoteDocumentPath,
  buildDemoQuotesHref,
  getDemoCustomerPath,
  getDemoInvoicePath,
  getDemoQuotePath,
} from '@/lib/demo-paths';

describe('demo paths', () => {
  it('builds canonical demo listing links', () => {
    assert.equal(DEMO_CUSTOMERS_PATH, '/demo/customers');
    assert.equal(buildDemoCustomersHref(), '/demo/customers');
    assert.equal(buildDemoCustomersHref({ filter: 'unread' }), '/demo/customers?filter=unread');
    assert.equal(buildDemoQuotesHref({}), '/demo/quotes');
    assert.equal(buildDemoInvoicesHref({}), '/demo/invoices');
    assert.equal(
      buildDemoQuotesHref({ view: 'needs-follow-up', status: 'sent', customer: 'demo-customer-1' }),
      '/demo/quotes?view=needs-follow-up&status=sent&customer=demo-customer-1'
    );
    assert.equal(
      buildDemoInvoicesHref({ status: 'overdue', q: 'INV-1001' }),
      '/demo/invoices?status=overdue&q=INV-1001'
    );
  });

  it('builds canonical demo detail links', () => {
    assert.equal(getDemoCustomerPath('demo-customer-1'), '/demo/customers/demo-customer-1');
    assert.equal(buildDemoNewCustomerPath(), '/demo/customers/new');
    assert.equal(getDemoQuotePath('demo-quote-1'), '/demo/quotes/demo-quote-1');
    assert.equal(getDemoInvoicePath('demo-invoice-1'), '/demo/invoices/demo-invoice-1');
    assert.equal(buildDemoNewQuotePath(), '/demo/quotes/new');
    assert.equal(buildDemoNewQuotePath({ customer: 'demo-customer-2' }), '/demo/quotes/new?customer=demo-customer-2');
    assert.equal(buildDemoQuoteDocumentPath(), '/demo/documents/quote');
    assert.equal(
      buildDemoQuoteDocumentPath({ quote: 'demo-quote-3' }),
      '/demo/documents/quote?quote=demo-quote-3'
    );
    assert.equal(buildDemoNewInvoicePath(), '/demo/invoices/new');
    assert.equal(
      buildDemoNewInvoicePath({ customer: 'demo-customer-2' }),
      '/demo/invoices/new?customer=demo-customer-2'
    );
    assert.equal(
      buildDemoNewInvoicePath({ customer: 'demo-customer-1', quote: 'demo-quote-1' }),
      '/demo/invoices/new?customer=demo-customer-1&quote=demo-quote-1'
    );
    assert.equal(buildDemoInvoiceDocumentPath(), '/demo/documents/invoice');
    assert.equal(
      buildDemoInvoiceDocumentPath({ invoice: 'demo-invoice-5' }),
      '/demo/documents/invoice?invoice=demo-invoice-5'
    );
    assert.equal(DEMO_SEARCH_PATH, '/demo/search');
  });
});