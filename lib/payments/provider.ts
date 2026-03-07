export type PaymentProvider = 'square' | 'none';

type PaymentProviderConfig = {
  paymentProvider?: string | null;
  squareAccessToken?: string | null;
  squareLocationId?: string | null;
  squareWebhookSignatureKey?: string | null;
};

function hasConfiguredValue(value: string | null | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return false;

  return !normalized.includes('your-') &&
    !normalized.includes('xxxxxxxx') &&
    !normalized.includes('replace-with') &&
    !normalized.includes('example.com');
}

export function parsePaymentProvider(value: string | null | undefined): PaymentProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'square' || normalized === 'none') {
    return normalized;
  }

  return null;
}

export function normalizePaymentProvider(value: string | null | undefined): PaymentProvider {
  return parsePaymentProvider(value) ?? 'none';
}

export function hasSquarePaymentConfiguration(config: PaymentProviderConfig): boolean {
  return hasConfiguredValue(config.squareAccessToken) &&
    hasConfiguredValue(config.squareLocationId) &&
    hasConfiguredValue(config.squareWebhookSignatureKey);
}

export function resolvePaymentProvider(config: PaymentProviderConfig): PaymentProvider {
  const explicitProvider = parsePaymentProvider(config.paymentProvider);
  if (explicitProvider) {
    return explicitProvider;
  }

  return hasSquarePaymentConfiguration(config) ? 'square' : 'none';
}

export function getPaymentProviderLabel(provider: PaymentProvider): string {
  return provider === 'square' ? 'Square' : 'None';
}
