'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateQuoteWithVersioning } from '@/lib/actions/quotes';
import { formatCents } from '@/lib/utils/format-currency';
import type { Quote, QuoteLineItem } from '@/lib/database.types';
import { Button } from '@/components/ui/button';

interface EditQuoteFormProps {
  quote: Quote;
}

interface EditableLineItem {
  description: string;
  amount_input: string;
}

function parseAmountToCents(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function sanitizeAmountInput(value: string): string {
  let sanitized = '';
  let hasDot = false;
  let decimalCount = 0;

  for (const char of value) {
    if (char === '-' && sanitized.length === 0) {
      sanitized += char;
      continue;
    }

    if (char >= '0' && char <= '9') {
      if (hasDot) {
        if (decimalCount >= 2) continue;
        decimalCount += 1;
      }
      sanitized += char;
      continue;
    }

    if (char === '.' && !hasDot) {
      hasDot = true;
      sanitized += char;
    }
  }

  return sanitized;
}

export function EditQuoteForm({ quote }: EditQuoteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState(quote.description);
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() => {
    const existing = (quote.line_items as QuoteLineItem[]) || [];
    if (existing.length === 0) return [{ description: '', amount_input: '' }];

    return existing.map((item) => ({
      description: item.description,
      amount_input: (item.amount_cents / 100).toFixed(2),
    }));
  });

  const normalizedStatus = quote.status;
  const isAccepted = normalizedStatus === 'accepted';

  const parsedItems = useMemo(
    () =>
      lineItems.map((item) => ({
        description: item.description.trim(),
        amount_cents: parseAmountToCents(item.amount_input),
      })),
    [lineItems]
  );

  const validLineItems = parsedItems.filter(
    (item) => item.description.length > 0 && item.amount_cents !== 0
  );
  const totalCents = validLineItems.reduce((sum, item) => sum + item.amount_cents, 0);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: '', amount_input: '' }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateLineItem = (index: number, field: keyof EditableLineItem, value: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]:
          field === 'amount_input' ? sanitizeAmountInput(value) : value,
      };
      return next;
    });
  };

  const handleSave = async () => {
    if (isSubmitting || isAccepted) return;

    if (!description.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (validLineItems.length === 0) {
      toast.error('Please add at least one line item with a non-zero amount');
      return;
    }

    if (totalCents <= 0) {
      toast.error('Quote total must be greater than $0.00');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateQuoteWithVersioning(quote.id, {
        description: description.trim(),
        line_items: validLineItems,
        total_cents: totalCents,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update quote');
        return;
      }

      toast.success(
        quote.status === 'draft'
          ? 'Quote updated'
          : 'New quote revision created'
      );
      router.push(`/quotes/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAccepted) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="font-medium text-amber-500">
          Accepted quotes are locked. Create a new quote if scope changes.
        </p>
        <Link href={`/quotes/${quote.id}`} className="mt-2 inline-block text-sm underline">
          Back to quote
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {quote.status !== 'draft' && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-500">
          Saving this edit will create a new draft revision and keep this quote as historical.
        </div>
      )}

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium">
          Job Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the work to be done..."
          className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Line Items <span className="text-destructive">*</span>
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Use a negative amount for discounts (example: -25.00).
        </p>
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                placeholder="Item description"
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
              />
              <div className="relative w-28 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="text"
                  inputMode="text"
                  value={item.amount_input}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => updateLineItem(index, 'amount_input', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-left text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                disabled={lineItems.length === 1 || isSubmitting}
                aria-label="Remove line item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLineItem}
          className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent/10"
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4" />
          Add Line Item
        </button>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="font-medium">Total</span>
        <span className={`text-2xl font-bold ${totalCents <= 0 ? 'text-destructive' : ''}`}>
          {formatCents(totalCents)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/quotes/${quote.id}`}>Cancel</Link>
        </Button>
        <Button
          type="button"
          className="w-full"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Save Quote'
          )}
        </Button>
      </div>
    </div>
  );
}
