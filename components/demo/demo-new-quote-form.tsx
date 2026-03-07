'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DemoCustomer, DemoQuote } from '@/lib/demo/demo-data';
import { DemoCustomerSelect } from '@/components/demo/demo-customer-select';
import { Button } from '@/components/ui/button';
import {
  normalizeEditableLineItems,
  parseAmountToCents,
  sanitizeAmountInput,
  toEditableLineItems,
} from '@/lib/demo/demo-form-utils';
import {
  buildDemoNewCustomerPath,
  buildDemoQuoteDocumentPath,
  buildDemoQuotesHref,
} from '@/lib/demo-paths';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';

const DEFAULT_DESCRIPTION = 'Priority diagnostics and repair plan for intermittent shutdown.';
const DEFAULT_LINE_ITEMS = [
  { description: 'Diagnostic and trip charge', amount_input: '125.00' },
  { description: 'Repair labor and parts allowance', amount_input: '120.00' },
];

export function DemoNewQuoteForm({
  customers,
  customer,
  draftQuote,
}: {
  customers: DemoCustomer[];
  customer: DemoCustomer | null;
  draftQuote: DemoQuote | null;
}) {
  const seededDraft = draftQuote?.status === 'draft' ? draftQuote : null;
  const [description, setDescription] = useState(seededDraft?.description ?? DEFAULT_DESCRIPTION);
  const [lineItems, setLineItems] = useState(
    seededDraft ? toEditableLineItems(seededDraft.line_items) : DEFAULT_LINE_ITEMS
  );

  const customerLabel = customer?.name || (customer ? formatPhoneNumber(customer.phone_number) : 'Demo customer');
  const totalCents = useMemo(
    () => lineItems.reduce((sum, item) => sum + parseAmountToCents(item.amount_input), 0),
    [lineItems]
  );

  const updateLineItem = (index: number, field: 'description' | 'amount_input', value: string) => {
    setLineItems((current) => {
      const next = [...current];
      next[index] = {
        ...next[index],
        [field]: field === 'amount_input' ? sanitizeAmountInput(value, true) : value,
      };
      return next;
    });
  };

  const validate = () => {
    if (!customer) return toast.error('Please select a demo customer'), false;
    if (!description.trim()) return toast.error('Please enter a job description'), false;
    if (normalizeEditableLineItems(lineItems).length === 0) {
      return toast.error('Please add at least one line item with a non-zero amount'), false;
    }
    if (totalCents <= 0) return toast.error('Quote total must be greater than $0.00'), false;
    return true;
  };

  return (
    <div className="space-y-4">
      <DemoCustomerSelect
        customers={customers}
        selectedCustomerId={customer?.id}
        basePath="/demo/quotes/new"
        addNewHref={buildDemoNewCustomerPath()}
        description="Switch the demo customer to update the editable draft form."
      />

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Selected Customer</p>
        <p className="font-semibold">{customerLabel}</p>
        {customer && <p className="text-sm text-muted-foreground">{formatPhoneNumber(customer.phone_number)}</p>}
        {customer?.address && <p className="mt-1 text-sm text-muted-foreground">{customer.address}</p>}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <label htmlFor="demo-quote-description" className="mb-2 block text-sm font-medium">
          Job Description
        </label>
        <textarea
          id="demo-quote-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Describe the scope of work..."
        />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Line Items</p>
            <p className="text-xs text-muted-foreground">Use a negative amount for discounts or credits.</p>
          </div>
          <button
            type="button"
            onClick={() => setLineItems((current) => [...current, { description: '', amount_input: '' }])}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-accent hover:bg-accent/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                placeholder="Item description"
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="relative w-24 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.amount_input}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => updateLineItem(index, 'amount_input', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => setLineItems((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                disabled={lineItems.length === 1}
                aria-label="Remove line item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Total</p>
          <p className="text-2xl font-bold">{formatCents(totalCents)}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Save and send are simulated on this screen so you can test the full line-item editing flow.
        </p>
        <Link
          href={buildDemoQuoteDocumentPath({ quote: draftQuote?.id })}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Customer Preview
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="outline" size="lg" asChild>
          <Link href={buildDemoQuotesHref({ customer: customer?.id })}>Cancel</Link>
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => validate() && toast.success('Demo quote draft saved (simulated)')}>
          Save Draft
        </Button>
        <Button type="button" size="lg" onClick={() => validate() && toast.success('Demo quote is ready to send (simulated)')}>
          Send Quote
        </Button>
      </div>
    </div>
  );
}