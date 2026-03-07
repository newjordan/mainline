'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, User, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import {
  createInvoiceFromQuote,
  createInvoiceManual,
  getInvoiceByQuoteId,
} from '@/lib/actions/invoices';
import { getQuote } from '@/lib/actions/quotes';
import { getCustomer, getCustomers } from '@/lib/actions/customers';
import type { Quote, QuoteLineItem, Customer, Invoice, InvoiceLineItem } from '@/lib/database.types';
import { toast } from 'sonner';

/**
 * New Invoice Page
 *
 * Supports two modes:
 * 1. From Quote: ?quote=ID - Creates invoice from accepted quote
 * 2. Direct: No params - Creates standalone invoice with customer selection
 */
interface EditableLineItem {
  description: string;
  amount_input: string;
}

function NewInvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const quoteId = searchParams.get('quote');
  const customerIdParam = searchParams.get('customer');

  // Shared state
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // From-quote mode state
  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  // Direct mode state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [manualJobDescription, setManualJobDescription] = useState<string>('');
  const [manualLineItems, setManualLineItems] = useState<EditableLineItem[]>([
    { description: '', amount_input: '' },
  ]);
  const [serviceAddress, setServiceAddress] = useState<string>('');
  const [quoteAmountDollars, setQuoteAmountDollars] = useState<string>('');
  const [quoteJobDescription, setQuoteJobDescription] = useState<string>('');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');

  const parseAmountToCents = (value: string): number => {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100);
  };

  const sanitizeAmountInput = (value: string, allowNegative = false): string => {
    let sanitized = '';
    let hasDot = false;
    let decimalCount = 0;

    for (const char of value) {
      if (allowNegative && char === '-' && sanitized.length === 0) {
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

  const quoteAmountCentsRaw = parseAmountToCents(quoteAmountDollars);
  const quoteAmountCents = quoteAmountCentsRaw > 0 ? quoteAmountCentsRaw : 0;
  const trimmedAdjustmentNote = adjustmentNote.trim();
  const trimmedQuoteJobDescription = quoteJobDescription.trim();
  const trimmedManualJobDescription = manualJobDescription.trim();
  const manualLineItemsParsed = manualLineItems
    .map((item) => ({
      description: item.description.trim(),
      amount_cents: parseAmountToCents(item.amount_input),
    }))
    .filter((item) => item.description && item.amount_cents !== 0) as InvoiceLineItem[];
  const manualTotalCents = manualLineItemsParsed.reduce(
    (sum, item) => sum + item.amount_cents,
    0
  );
  const isFromQuote = !!quoteId;

  useEffect(() => {
    async function loadData() {
      if (isFromQuote) {
        // From-quote mode
        try {
          const quoteResult = await getQuote(quoteId);
          if (!quoteResult.success || !quoteResult.data) {
            setError('Quote not found');
            setLoading(false);
            return;
          }

          const loadedQuote = quoteResult.data;
          setQuote(loadedQuote);
          setQuoteAmountDollars((loadedQuote.total_cents / 100).toFixed(2));
          setQuoteJobDescription(loadedQuote.description || '');

          if (loadedQuote.status !== 'accepted') {
            setError('Quote must be accepted before creating an invoice');
            setLoading(false);
            return;
          }

          const existingResult = await getInvoiceByQuoteId(quoteId);
          if (existingResult.success && existingResult.data) {
            setExistingInvoice(existingResult.data);
            setLoading(false);
            return;
          }

          const customerResult = await getCustomer(loadedQuote.customer_id);
          if (customerResult.success && customerResult.data) {
            setCustomer(customerResult.data);
          }

          setLoading(false);
        } catch (err) {
          console.error('Error loading data:', err);
          setError('Failed to load quote data');
          setLoading(false);
        }
      } else {
        // Direct mode - load customers
        try {
          const customersResult = await getCustomers();
          if (customersResult.success) {
            setCustomers(customersResult.data);
            if (
              customerIdParam &&
              customersResult.data.some((entry) => entry.id === customerIdParam)
            ) {
              setSelectedCustomerId(customerIdParam);
            }
          }
          setLoading(false);
        } catch (err) {
          console.error('Error loading customers:', err);
          setError('Failed to load customers');
          setLoading(false);
        }
      }
    }

    loadData();
  }, [quoteId, isFromQuote, customerIdParam]);

  const addManualLineItem = () => {
    setManualLineItems((prev) => [...prev, { description: '', amount_input: '' }]);
  };

  const removeManualLineItem = (index: number) => {
    setManualLineItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateManualLineItem = (
    index: number,
    field: keyof EditableLineItem,
    value: string
  ) => {
    setManualLineItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]:
          field === 'amount_input' ? sanitizeAmountInput(value, true) : value,
      };
      return next;
    });
  };

  const handleCreateFromQuote = async () => {
    if (!quoteId) return;
    if (!quoteAmountCents || quoteAmountCents <= 0) {
      toast.error('Please enter a valid final invoice amount');
      return;
    }
    if (!trimmedQuoteJobDescription) {
      toast.error('Please add a job description');
      return;
    }
    if (quote && quoteAmountCents !== quote.total_cents && !trimmedAdjustmentNote) {
      toast.error('Please add an adjustment note when changing the quoted amount');
      return;
    }

    setCreating(true);
    try {
      const result = await createInvoiceFromQuote(
        quoteId,
        quoteAmountCents,
        trimmedAdjustmentNote || undefined,
        trimmedQuoteJobDescription
      );

      if (result.success) {
        toast.success('Invoice created successfully');
        router.push(`/invoices/${result.data.id}`);
      } else {
        toast.error(result.error);
        setCreating(false);
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
      setCreating(false);
    }
  };

  const handleCreateManual = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!trimmedManualJobDescription) {
      toast.error('Please add a job description');
      return;
    }

    if (manualLineItemsParsed.length === 0) {
      toast.error('Please add at least one line item with a non-zero amount');
      return;
    }

    if (!manualTotalCents || manualTotalCents <= 0) {
      toast.error('Invoice total must be greater than $0.00');
      return;
    }

    setCreating(true);
    try {
      const result = await createInvoiceManual({
        customer_id: selectedCustomerId,
        amount_cents: manualTotalCents,
        line_items: manualLineItemsParsed,
        job_description: trimmedManualJobDescription,
        service_address: serviceAddress || undefined,
      });

      if (result.success) {
        toast.success('Invoice created successfully');
        router.push(`/invoices/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create invoice');
        setCreating(false);
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
      setCreating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Back to invoices"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Create Invoice</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
          <Link
            href="/invoices"
            className="mt-4 inline-block text-sm text-accent underline"
          >
            Back to invoices
          </Link>
        </div>
      </div>
    );
  }

  // Invoice already exists (from-quote mode)
  if (existingInvoice) {
    return (
      <div className="p-4">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={quote ? `/quotes/${quote.id}` : '/invoices'}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Invoice Already Exists</h1>
        </div>
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-6">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle size={20} />
            <p>An invoice has already been created for this quote.</p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/invoices/${existingInvoice.id}`}>View Invoice</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full sm:w-auto">
              <Link href={quote ? `/quotes/${quote.id}` : '/invoices'}>
                Back to Quote
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // From-quote mode: show quote summary
  if (isFromQuote && quote) {
    const displayName =
      customer?.name ||
      (customer?.phone_number
        ? formatPhoneNumber(customer.phone_number)
        : 'Unknown');

    return (
      <div className="p-4">
        <div className="mb-6 flex min-w-0 items-center gap-3">
          <Link
            href={`/quotes/${quote.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Back to quote"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Create Invoice</h1>
            <p className="text-sm text-muted-foreground">
              from Quote {quote.short_ref}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border bg-card p-4">
          <h2 className="mb-4 font-semibold">Review Invoice Details</h2>

          <div className="mb-4 flex items-start gap-3">
            <User size={20} className="mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="truncate font-medium">{displayName}</p>
              {customer?.address && (
                <p className="text-sm text-muted-foreground">
                  {customer.address}
                </p>
              )}
            </div>
          </div>

          {quote.service_address && (
            <div className="mb-4 flex items-start gap-3">
              <FileText size={20} className="mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Service Address</p>
                <p className="font-medium">{quote.service_address}</p>
              </div>
            </div>
          )}

          <div className="mb-4 flex items-start gap-3">
            <DollarSign size={20} className="mt-1 text-muted-foreground" />
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Final Invoice Amount</p>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quoteAmountDollars}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setQuoteAmountDollars(sanitizeAmountInput(e.target.value))
                  }
                  placeholder="0.00"
                  className="h-11 w-full rounded-lg border bg-background py-2 pl-7 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={creating}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Quote total: {formatCents(quote.total_cents)}
                {quoteAmountCents > 0 && quoteAmountCents !== quote.total_cents && (
                  <>
                    {' · '}
                    <span
                      className={
                        quoteAmountCents > quote.total_cents
                          ? 'text-amber-500'
                          : 'text-green-500'
                      }
                    >
                      {quoteAmountCents > quote.total_cents ? '+' : '-'}
                      {formatCents(Math.abs(quoteAmountCents - quote.total_cents))}{' '}
                      adjustment
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="adjustment-note"
              className="mb-2 block text-sm font-medium"
            >
              Adjustment Note{' '}
              {quoteAmountCents > 0 && quoteAmountCents !== quote.total_cents && (
                <span className="text-destructive">*</span>
              )}
            </label>
            <textarea
              id="adjustment-note"
              value={adjustmentNote}
              onChange={(e) => setAdjustmentNote(e.target.value)}
              placeholder="Explain why the final invoice total changed (parts, labor, discount, etc.)"
              className="min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={creating}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This note is saved as part of the invoice and shown before sending.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="quote-job-description" className="mb-2 block text-sm font-medium">
              Job Description <span className="text-destructive">*</span>
            </label>
            <textarea
              id="quote-job-description"
              value={quoteJobDescription}
              onChange={(e) => setQuoteJobDescription(e.target.value)}
              placeholder="Describe work completed for this invoice"
              className="min-h-[90px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={creating}
            />
          </div>

          <div className="flex items-start gap-3">
            <FileText size={20} className="mt-1 text-muted-foreground" />
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Quoted Line Items</p>
              <div className="mt-2 space-y-2">
                {(Array.isArray(quote.line_items) ? (quote.line_items as QuoteLineItem[]) : []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="pr-3">{item.description}</span>
                    <span className="font-medium tabular-nums">
                      {formatCents(item.amount_cents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-muted/50 p-4 text-sm">
          <p className="text-muted-foreground">
            This invoice will be created as a <strong>draft</strong>. You can
            review it before sending to the customer.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleCreateFromQuote}
            disabled={creating || quoteAmountCents <= 0 || !trimmedQuoteJobDescription}
            className="w-full"
            size="lg"
          >
            {creating ? 'Creating Invoice...' : 'Create Invoice'}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href={`/quotes/${quote.id}`}>Cancel</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Direct mode: show customer selection form
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="p-4">
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link
          href="/invoices"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to invoices"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">New Invoice</h1>
          <p className="text-sm text-muted-foreground">
            Create a standalone invoice
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Customer Selection */}
        <div>
          <label htmlFor="customer" className="mb-2 block text-sm font-medium">
            Customer <span className="text-destructive">*</span>
          </label>
          <select
            id="customer"
            value={selectedCustomerId}
            onChange={(e) => { setSelectedCustomerId(e.target.value); setServiceAddress(''); }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={creating}
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || formatPhoneNumber(c.phone_number)}
                {c.name && ` (${formatPhoneNumber(c.phone_number)})`}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No customers yet.{' '}
              <Link href="/customers/new" className="text-accent underline">
                Create one first
              </Link>
              .
            </p>
          )}
        </div>

        {/* Selected Customer Info */}
        {selectedCustomer && (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Invoice for:</p>
            <p className="font-semibold">
              {selectedCustomer.name ||
                formatPhoneNumber(selectedCustomer.phone_number)}
            </p>
            {selectedCustomer.address && (
              <p className="text-sm text-muted-foreground">
                {selectedCustomer.address}
              </p>
            )}
          </div>
        )}

        {/* Service Address */}
        {selectedCustomer && (() => {
          const addressOptions: string[] = [];
          if (selectedCustomer.address) addressOptions.push(selectedCustomer.address);
          if (selectedCustomer.additional_addresses) {
            for (const addr of selectedCustomer.additional_addresses) {
              const trimmed = addr.trim();
              if (trimmed && !addressOptions.includes(trimmed)) {
                addressOptions.push(trimmed);
              }
            }
          }
          if (addressOptions.length <= 1) return null;
          return (
            <div>
              <label htmlFor="service-address" className="mb-2 block text-sm font-medium">
                Service Address
              </label>
              <select
                id="service-address"
                value={serviceAddress}
                onChange={(e) => setServiceAddress(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={creating}
              >
                <option value="">Select an address...</option>
                {addressOptions.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Which address is this invoice for?
              </p>
            </div>
          );
        })()}

        {/* Job Description */}
        <div>
          <label htmlFor="manual-job-description" className="mb-2 block text-sm font-medium">
            Job Description <span className="text-destructive">*</span>
          </label>
          <textarea
            id="manual-job-description"
            value={manualJobDescription}
            onChange={(e) => setManualJobDescription(e.target.value)}
            placeholder="Describe the work completed..."
            className="min-h-[90px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={creating}
          />
        </div>

        {/* Line Items */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Line Items <span className="text-destructive">*</span>
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Add a negative amount for discounts (example: -25.00).
          </p>
          <div className="space-y-2">
            {manualLineItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    updateManualLineItem(index, 'description', e.target.value)
                  }
                  placeholder="Item description"
                  className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={creating}
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
                    onChange={(e) =>
                      updateManualLineItem(index, 'amount_input', e.target.value)
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-left text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={creating}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeManualLineItem(index)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  disabled={manualLineItems.length === 1 || creating}
                  aria-label="Remove line item"
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addManualLineItem}
            className="mt-2"
            disabled={creating}
          >
            Add Line Item
          </Button>
        </div>

        {/* Total Preview */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <span className="font-medium">Invoice Total</span>
          <span className={`text-2xl font-bold ${manualTotalCents <= 0 ? 'text-destructive' : ''}`}>
            {formatCents(manualTotalCents)}
          </span>
        </div>

        {/* Status Note */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="text-muted-foreground">
            This invoice will be created as a <strong>draft</strong>. You can
            review it before sending to the customer.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={creating}
            className="w-full sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateManual}
            disabled={
              creating ||
              !selectedCustomerId ||
              manualTotalCents <= 0 ||
              !trimmedManualJobDescription
            }
            className="w-full sm:flex-1"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Invoice'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      }
    >
      <NewInvoiceContent />
    </Suspense>
  );
}
