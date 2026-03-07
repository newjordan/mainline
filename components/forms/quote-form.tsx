'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createQuote } from '@/lib/actions/quotes';
import { formatCents } from '@/lib/utils/format-currency';
import type { Customer } from '@/lib/database.types';

interface LineItem {
  description: string;
  amount_input: string;
}

interface QuoteFormProps {
  customer: Customer;
}

/**
 * QuoteForm Component
 *
 * Fill-in-blank quote form for creating quotes from customer detail.
 * Features:
 * - Pre-filled customer info
 * - Dynamic line items (add/remove)
 * - Auto-calculated total
 * - Save as draft or finalize for review
 * - Mobile-first, one-hand operable
 */
export function QuoteForm({ customer }: QuoteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount_input: '' },
  ]);

  const parseAmountToCents = (value: string): number => {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100);
  };

  const sanitizeAmountInput = (value: string): string => {
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
      } else if (char === '.' && !hasDot) {
        hasDot = true;
        sanitized += char;
      }
    }

    return sanitized;
  };

  const totalCents = lineItems.reduce(
    (sum, item) => sum + parseAmountToCents(item.amount_input),
    0
  );

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount_input: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updated = [...lineItems];
    if (field === 'amount_input') {
      updated[index].amount_input = sanitizeAmountInput(value as string);
    } else {
      updated[index].description = value as string;
    }
    setLineItems(updated);
  };

  const handleSubmit = async (asDraft: boolean) => {
    // Validate
    if (!description.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    const validLineItems = lineItems
      .map((item) => ({
        description: item.description.trim(),
        amount_cents: parseAmountToCents(item.amount_input),
      }))
      .filter((item) => item.description && item.amount_cents !== 0);

    if (validLineItems.length === 0) {
      toast.error('Please add at least one line item with description and non-zero amount');
      return;
    }

    const total = validLineItems.reduce((sum, item) => sum + item.amount_cents, 0);
    if (total <= 0) {
      toast.error('Quote total must be greater than $0.00');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createQuote({
        customer_id: customer.id,
        description: description.trim(),
        line_items: validLineItems,
        total_cents: total,
        // Sending is a separate explicit action on the quote detail page.
        status: 'draft',
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create quote');
        return;
      }

      toast.success(
        asDraft
          ? 'Draft saved'
          : 'Quote finalized. Send it from the quote screen.'
      );
      router.push(`/quotes/${result.data.id}`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = customer.name || customer.phone_number;

  return (
    <div className="space-y-6">
      {/* Customer Info (read-only) */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Quote for:</p>
        <p className="font-semibold">{displayName}</p>
        {customer.address && (
          <p className="text-sm text-muted-foreground">{customer.address}</p>
        )}
      </div>

      {/* Job Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium"
        >
          Job Description
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

      {/* Line Items */}
      <div>
        <label className="mb-2 block text-sm font-medium">Line Items</label>
        <p className="mb-2 text-xs text-muted-foreground">
          Use a negative amount for discounts (example: -25.00).
        </p>
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateLineItem(index, 'description', e.target.value)
                }
                placeholder="Item description"
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
              />
              <div className="relative w-24 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="text"
                  inputMode="text"
                  value={item.amount_input}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    updateLineItem(index, 'amount_input', e.target.value)
                  }
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

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="font-medium">Total</span>
        <span className="text-2xl font-bold">{formatCents(totalCents)}</span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full rounded-lg border px-4 py-3 text-sm font-medium hover:bg-accent/10"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          className="w-full rounded-lg border px-4 py-3 text-sm font-medium hover:bg-accent/10"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            'Save Draft'
          )}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            'Finalize Quote'
          )}
        </button>
      </div>
    </div>
  );
}
