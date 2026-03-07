'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DemoCustomer, DemoInvoice, DemoQuote } from '@/lib/demo/demo-data';
import { DemoCustomerSelect } from '@/components/demo/demo-customer-select';
import { Button } from '@/components/ui/button';
import {
  centsToAmountInput,
  normalizeEditableLineItems,
  parseAmountToCents,
  sanitizeAmountInput,
  toEditableLineItems,
} from '@/lib/demo/demo-form-utils';
import {
  buildDemoInvoiceDocumentPath,
  buildDemoInvoicesHref,
  buildDemoNewCustomerPath,
  getDemoQuotePath,
} from '@/lib/demo-paths';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';

export function DemoNewInvoiceForm({
  customers,
  customer,
  quote,
  draftInvoice,
}: {
  customers: DemoCustomer[];
  customer: DemoCustomer | null;
  quote: DemoQuote | null;
  draftInvoice: DemoInvoice | null;
}) {
  const isFromQuote = !!quote;
  const [amountInput, setAmountInput] = useState(
    centsToAmountInput(draftInvoice?.amount_cents ?? quote?.total_cents ?? 24500)
  );
  const [adjustmentNote, setAdjustmentNote] = useState(draftInvoice?.adjustment_note ?? '');
  const [jobDescription, setJobDescription] = useState(
    draftInvoice?.job_description ?? quote?.description ?? ''
  );
  const [manualLineItems, setManualLineItems] = useState(
    isFromQuote ? [{ description: '', amount_input: '' }] : toEditableLineItems(draftInvoice?.line_items)
  );

  const quotedAmountCents = quote?.total_cents ?? 0;
  const finalAmountCents = parseAmountToCents(amountInput);
  const varianceCents = finalAmountCents - quotedAmountCents;
  const manualTotalCents = useMemo(
    () => manualLineItems.reduce((sum, item) => sum + parseAmountToCents(item.amount_input), 0),
    [manualLineItems]
  );
  const customerLabel = customer?.name || (customer ? formatPhoneNumber(customer.phone_number) : 'Demo customer');
  const previewHref = buildDemoInvoiceDocumentPath({ invoice: draftInvoice?.id });

  const validateFromQuote = () => {
    if (!finalAmountCents || finalAmountCents <= 0) return toast.error('Please enter a valid final invoice amount'), false;
    if (!jobDescription.trim()) return toast.error('Please add a job description'), false;
    if (quote && finalAmountCents !== quote.total_cents && !adjustmentNote.trim()) {
      return toast.error('Please add an adjustment note when changing the quoted amount'), false;
    }
    return true;
  };

  const validateManual = () => {
    if (!customer) return toast.error('Please select a demo customer'), false;
    if (!jobDescription.trim()) return toast.error('Please add a job description'), false;
    if (normalizeEditableLineItems(manualLineItems).length === 0) {
      return toast.error('Please add at least one line item with a non-zero amount'), false;
    }
    if (manualTotalCents <= 0) return toast.error('Invoice total must be greater than $0.00'), false;
    return true;
  };

  return (
    <div className="space-y-4">
      {!quote && (
        <DemoCustomerSelect
          customers={customers}
          selectedCustomerId={customer?.id}
          basePath="/demo/invoices/new"
          addNewHref={buildDemoNewCustomerPath()}
          description="Choose a demo customer before editing the draft invoice."
        />
      )}

      {customer && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">{quote ? 'Customer from Quote' : 'Selected Customer'}</p>
          <p className="font-semibold">{customerLabel}</p>
          <p className="text-sm text-muted-foreground">{formatPhoneNumber(customer.phone_number)}</p>
          {(quote?.service_address || customer.address) && (
            <p className="mt-1 text-sm text-muted-foreground">{quote?.service_address || customer.address}</p>
          )}
        </div>
      )}

      {quote && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Accepted Quote</p>
              <p className="font-semibold">{quote.short_ref}</p>
            </div>
            <p className="text-sm text-muted-foreground">Quote total: {formatCents(quote.total_cents)}</p>
          </div>
          <p className="mt-2 text-sm">{quote.description}</p>
          <Link href={getDemoQuotePath(quote.id)} className="mt-3 inline-flex text-sm text-accent hover:underline">
            Back to quote
          </Link>
        </div>
      )}

      {isFromQuote ? (
        <>
          <div className="rounded-xl border bg-card p-4">
            <label htmlFor="demo-final-amount" className="mb-2 block text-sm font-medium">Final Invoice Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                id="demo-final-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setAmountInput(sanitizeAmountInput(e.target.value))}
                className="h-11 w-full rounded-lg border bg-background py-2 pl-7 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Quote total: {formatCents(quotedAmountCents)}
              {varianceCents !== 0 && (
                <span className="ml-2 font-medium text-amber-500">
                  {varianceCents > 0 ? '+' : '-'}{formatCents(Math.abs(varianceCents))} adjustment
                </span>
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label htmlFor="demo-adjustment-note" className="mb-2 block text-sm font-medium">
              Adjustment Note {varianceCents !== 0 && <span className="text-destructive">*</span>}
            </label>
            <textarea
              id="demo-adjustment-note"
              value={adjustmentNote}
              onChange={(e) => setAdjustmentNote(e.target.value)}
              className="min-h-[90px] w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Explain why the final invoice total changed."
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label htmlFor="demo-job-description" className="mb-2 block text-sm font-medium">Job Description</label>
            <textarea
              id="demo-job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe the completed work."
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-sm font-medium">Quoted Line Items</p>
            <div className="space-y-2">
              {(draftInvoice?.line_items ?? quote.line_items).map((item, index) => (
                <div key={`${item.description}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1">{item.description}</span>
                  <span className="font-medium tabular-nums">{formatCents(item.amount_cents)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4">
            <label htmlFor="demo-manual-job-description" className="mb-2 block text-sm font-medium">Job Description</label>
            <textarea
              id="demo-manual-job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe the work completed..."
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Line Items</p>
                <p className="text-xs text-muted-foreground">Use a negative amount for discounts or credits.</p>
              </div>
              <button
                type="button"
                onClick={() => setManualLineItems((current) => [...current, { description: '', amount_input: '' }])}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-accent hover:bg-accent/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {manualLineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => setManualLineItems((current) => current.map((entry, i) => i === index ? { ...entry, description: e.target.value } : entry))}
                    placeholder="Item description"
                    className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.amount_input}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setManualLineItems((current) => current.map((entry, i) => i === index ? { ...entry, amount_input: sanitizeAmountInput(e.target.value, true) } : entry))}
                      placeholder="0.00"
                      className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualLineItems((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    disabled={manualLineItems.length === 1}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Invoice Total</p>
              <p className={`text-2xl font-bold ${manualTotalCents <= 0 ? 'text-destructive' : ''}`}>
                {formatCents(manualTotalCents)}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Next Step</p>
        <p className="mt-1 text-sm">Draft edits are simulated here so you can test amount and line-item adjustments before the send flow.</p>
        <Link href={previewHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          Customer Preview
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="outline" size="lg" asChild>
          <Link href={quote ? getDemoQuotePath(quote.id) : buildDemoInvoicesHref({ customer: customer?.id })}>Back</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href={previewHref} target="_blank" rel="noreferrer">Preview Draft</Link>
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => (isFromQuote ? validateFromQuote() : validateManual()) && toast.success('Demo invoice draft saved (simulated)')}
        >
          Save Draft
        </Button>
      </div>
    </div>
  );
}