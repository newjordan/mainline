import type { InvoiceLineItem, QuoteLineItem } from '@/lib/database.types';

export interface DemoEditableLineItem {
  description: string;
  amount_input: string;
}

export function parseAmountToCents(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function isAdjustmentNoteRequired(
  amountCents: number,
  quoteAmountCents?: number | null
): boolean {
  return quoteAmountCents != null && amountCents > 0 && amountCents !== quoteAmountCents;
}

export function sanitizeAmountInput(value: string, allowNegative = false): string {
  let sanitized = '';
  let hasDot = false;
  let decimalCount = 0;

  for (const char of value) {
    if (allowNegative && char === '-' && sanitized.length === 0) {
      sanitized += char;
      continue;
    }
    if (char >= '0' && char <= '9') {
      if (hasDot && decimalCount >= 2) continue;
      sanitized += char;
      if (hasDot) decimalCount += 1;
      continue;
    }
    if (char === '.' && !hasDot) {
      sanitized += char;
      hasDot = true;
    }
  }

  return sanitized;
}

export function centsToAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function toEditableLineItems(
  items?: QuoteLineItem[] | InvoiceLineItem[] | null
): DemoEditableLineItem[] {
  if (!items?.length) return [{ description: '', amount_input: '' }];
  return items.map((item) => ({
    description: item.description,
    amount_input: centsToAmountInput(item.amount_cents),
  }));
}

export function normalizeEditableLineItems(items: DemoEditableLineItem[]): InvoiceLineItem[] {
  return items
    .map((item) => ({
      description: item.description.trim(),
      amount_cents: parseAmountToCents(item.amount_input),
    }))
    .filter((item) => item.description && item.amount_cents !== 0);
}