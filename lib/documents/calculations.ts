/**
 * Integer-cent quote and invoice math.
 *
 * Line items are stored in cents. Tax is applied once to the subtotal
 * (not per line) so rounding cannot drift across rows. Rates are basis
 * points: 825 = 8.25%. Half amounts round away from zero.
 */

export type DocumentTotals = {
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
};

export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Amount must be a finite number');
  }

  const negative = value < 0;
  const rounded = Math.round(Math.abs(value));
  return negative ? -rounded : rounded;
}

/**
 * Convert a dollar amount to integer cents.
 * Decimal rounding avoids the binary float trap where
 * `Math.round(1.005 * 100)` becomes 100 instead of 101.
 */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new Error('Amount must be a finite number');
  }

  const negative = dollars < 0;
  const [whole, fraction = ''] = Math.abs(dollars).toFixed(8).split('.');
  const digits = (fraction + '000').slice(0, 3);
  let cents = Number(whole) * 100 + Number(digits.slice(0, 2));
  if (digits[2] >= '5') {
    cents += 1;
  }

  return negative ? -cents : cents;
}

export function parseAmountToCents(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return 0;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return dollarsToCents(amount);
}

export function sumLineItemCents(lineItems: Array<{ amount_cents: number }>): number {
  return lineItems.reduce((sum, item) => {
    if (!Number.isInteger(item.amount_cents)) {
      throw new Error('Line item amounts must be integer cents');
    }

    return sum + item.amount_cents;
  }, 0);
}

export function calculateTaxCents(subtotalCents: number, taxRateBps: number): number {
  if (!Number.isInteger(subtotalCents)) {
    throw new Error('Subtotal must be integer cents');
  }

  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
    throw new Error('Tax rate must be an integer from 0 to 10000 basis points');
  }

  const negative = subtotalCents < 0;
  const product = Math.abs(subtotalCents) * taxRateBps;
  const quotient = Math.floor(product / 10000);
  const remainder = product % 10000;
  const rounded = remainder >= 5000 ? quotient + 1 : quotient;
  return negative ? -rounded : rounded;
}

export function calculateDocumentTotals(
  lineItems: Array<{ amount_cents: number }>,
  taxRateBps = 0
): DocumentTotals {
  const subtotalCents = sumLineItemCents(lineItems);
  const taxCents = calculateTaxCents(subtotalCents, taxRateBps);
  return {
    subtotalCents,
    taxRateBps,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

export function formatTaxRate(taxRateBps: number): string {
  return `${(taxRateBps / 100).toFixed(2)}%`;
}
