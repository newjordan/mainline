/**
 * Format cents as USD currency string
 * @param cents - Amount in cents (e.g., 1500 = $15.00)
 */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Format a dollar amount (already in dollars, not cents)
 */
export function formatDollars(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Parse a currency string to cents
 * @param value - Currency string like "$15.00" or "15.00"
 */
export function parseToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const dollars = parseFloat(cleaned);
  return Math.round(dollars * 100);
}
