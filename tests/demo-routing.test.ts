import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDemoRewritePath } from '@/lib/demo-routing';

describe('getDemoRewritePath', () => {
  it('rewrites protected app routes into demo routes', () => {
    assert.equal(getDemoRewritePath('/auth/login'), '/demo/login');
    assert.equal(getDemoRewritePath('/home'), '/demo/home');
    assert.equal(getDemoRewritePath('/customers/demo-customer-1'), '/demo/customers/demo-customer-1');
    assert.equal(getDemoRewritePath('/quotes/new'), '/demo/quotes/new');
    assert.equal(getDemoRewritePath('/invoices/demo-invoice-1'), '/demo/invoices/demo-invoice-1');
    assert.equal(getDemoRewritePath('/search'), '/demo/search');
  });

  it('does not rewrite demo or public marketing routes', () => {
    assert.equal(getDemoRewritePath('/demo/login'), null);
    assert.equal(getDemoRewritePath('/'), null);
    assert.equal(getDemoRewritePath('/screens'), null);
    assert.equal(getDemoRewritePath('/privacy'), null);
  });

  it('routes setup wizard traffic away from the live flow in demo mode', () => {
    assert.equal(getDemoRewritePath('/setup-wizard'), '/demo/login');
  });
});