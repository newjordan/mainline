import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizePaymentProvider,
  parsePaymentProvider,
  resolvePaymentProvider,
} from '../lib/payments/provider.ts';

describe('payment provider helpers', () => {
  it('parses explicit providers', () => {
    assert.equal(parsePaymentProvider('square'), 'square');
    assert.equal(parsePaymentProvider('none'), 'none');
    assert.equal(parsePaymentProvider(' Stripe '), null);
  });

  it('normalizes invalid provider values to none', () => {
    assert.equal(normalizePaymentProvider(undefined), 'none');
    assert.equal(normalizePaymentProvider('sandbox'), 'none');
  });

  it('prefers explicit provider selection over inferred credentials', () => {
    assert.equal(
      resolvePaymentProvider({
        paymentProvider: 'none',
        squareAccessToken: 'EAAAreal-token',
        squareLocationId: 'L123456789',
        squareWebhookSignatureKey: 'sig-key',
      }),
      'none'
    );
  });

  it('infers square only when non-placeholder square credentials are present', () => {
    assert.equal(
      resolvePaymentProvider({
        squareAccessToken: 'EAAAreal-token',
        squareLocationId: 'L123456789',
        squareWebhookSignatureKey: 'sig-key',
      }),
      'square'
    );

    assert.equal(
      resolvePaymentProvider({
        squareAccessToken: 'EAAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        squareLocationId: 'Lxxxxxxxxxxxxxxx',
        squareWebhookSignatureKey: 'webhooks-signature-key',
      }),
      'none'
    );
  });
});