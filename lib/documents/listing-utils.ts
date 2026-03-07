export const DEFAULT_LIST_LIMIT = 40;
export const LIST_INCREMENT = 40;
export const MAX_LIST_LIMIT = 240;

export type QuoteSavedView =
  | 'all'
  | 'needs-follow-up'
  | 'awaiting-payment'
  | 'recently-completed'
  | 'archived';

export type QuoteStatusFilter =
  | 'any'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'completed';

export type InvoiceSavedView =
  | 'all'
  | 'needs-follow-up'
  | 'awaiting-payment'
  | 'recently-completed'
  | 'archived';

export type InvoiceStatusFilter =
  | 'any'
  | 'draft'
  | 'sent'
  | 'overdue'
  | 'paid'
  | 'completed';

function firstValue(value?: string | string[] | null): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export function normalizeSearchTerm(value?: string | string[] | null): string {
  const raw = firstValue(value);
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.replace(/[,%()]/g, ' ').slice(0, 60).trim();
}

export function normalizeListLimit(value?: string | string[]): number {
  const parsed = Number(firstValue(value));
  if (!Number.isFinite(parsed)) return DEFAULT_LIST_LIMIT;
  if (parsed < LIST_INCREMENT) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIST_LIMIT);
}

export function normalizeQuoteSavedView(
  value?: string | string[],
  legacyFilter?: string | string[]
): QuoteSavedView {
  const normalizedValue = firstValue(value);
  const normalizedLegacyFilter = firstValue(legacyFilter);

  if (
    normalizedValue === 'needs-follow-up' ||
    normalizedValue === 'awaiting-payment' ||
    normalizedValue === 'recently-completed' ||
    normalizedValue === 'archived'
  ) {
    return normalizedValue;
  }

  if (normalizedLegacyFilter === 'pending') return 'needs-follow-up';
  if (normalizedLegacyFilter === 'completed') return 'recently-completed';
  if (normalizedLegacyFilter === 'archived') return 'archived';

  return 'all';
}

export function normalizeQuoteStatusFilter(value?: string | string[]): QuoteStatusFilter {
  const normalizedValue = firstValue(value);

  if (
    normalizedValue === 'draft' ||
    normalizedValue === 'sent' ||
    normalizedValue === 'accepted' ||
    normalizedValue === 'rejected' ||
    normalizedValue === 'completed'
  ) {
    return normalizedValue;
  }

  return 'any';
}

export function normalizeInvoiceSavedView(
  value?: string | string[],
  legacyFilter?: string | string[]
): InvoiceSavedView {
  const normalizedValue = firstValue(value);
  const normalizedLegacyFilter = firstValue(legacyFilter);

  if (
    normalizedValue === 'needs-follow-up' ||
    normalizedValue === 'awaiting-payment' ||
    normalizedValue === 'recently-completed' ||
    normalizedValue === 'archived'
  ) {
    return normalizedValue;
  }

  if (normalizedLegacyFilter === 'outstanding') return 'awaiting-payment';
  if (normalizedLegacyFilter === 'completed') return 'recently-completed';
  if (normalizedLegacyFilter === 'archived') return 'archived';

  return 'all';
}

export function normalizeInvoiceStatusFilter(
  value?: string | string[],
  legacyFilter?: string | string[]
): InvoiceStatusFilter {
  const normalizedValue = firstValue(value);
  const normalizedLegacyFilter = firstValue(legacyFilter);

  if (
    normalizedValue === 'draft' ||
    normalizedValue === 'sent' ||
    normalizedValue === 'overdue' ||
    normalizedValue === 'paid' ||
    normalizedValue === 'completed'
  ) {
    return normalizedValue;
  }

  if (normalizedLegacyFilter === 'paid') {
    return 'paid';
  }

  return 'any';
}

export function sortByLabel<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}
