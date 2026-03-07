import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Archive,
  MapPin,
} from 'lucide-react';
import { getInvoice } from '@/lib/actions/invoices';
import { getQuote } from '@/lib/actions/quotes';
import { getCustomer } from '@/lib/actions/customers';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { SendInvoiceButton } from '@/components/invoice/send-invoice-button';
import { DraftAmountEditor } from '@/components/invoice/draft-amount-editor';
import { CompleteInvoiceButton } from '@/components/invoice/complete-invoice-button';
import { ArchiveInvoiceButton } from '@/components/invoice/archive-invoice-button';
import { DeleteInvoiceButton } from '@/components/invoice/delete-invoice-button';
import { InvoiceReferenceCard } from '@/components/invoice/invoice-reference-card';
import type { InvoiceLineItem, QuoteLineItem } from '@/lib/database.types';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';

/**
 * Validate that a payment link URL is safe to render
 * Only allows HTTPS URLs to prevent XSS via javascript: or data: URIs
 */
function isSafePaymentLink(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Invoice Detail Page
 *
 * Shows full invoice details with:
 * - Invoice amount and status
 * - Customer info (linked)
 * - Related quote (linked)
 * - Action buttons based on status
 */
export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;

  const invoiceResult = await getInvoice(id);

  if (!invoiceResult.success || !invoiceResult.data) {
    notFound();
  }

  const invoice = invoiceResult.data;

  // Fetch related data
  const customerResult = await getCustomer(invoice.customer_id);
  const customer = customerResult.success ? customerResult.data : null;

  let quote = null;
  if (invoice.quote_id) {
    const quoteResult = await getQuote(invoice.quote_id);
    quote = quoteResult.success ? quoteResult.data : null;
  }

  const displayName =
    customer?.name ||
    (customer?.phone_number ? formatPhoneNumber(customer.phone_number) : 'Unknown');
  const invoiceLineItems = (
    (Array.isArray(invoice.line_items) ? (invoice.line_items as InvoiceLineItem[]) : [])
      .filter((item) => item.description && item.amount_cents !== 0)
  );
  const fallbackQuoteLineItems = (
    (quote && Array.isArray(quote.line_items) ? (quote.line_items as QuoteLineItem[]) : [])
      .filter((item) => item.description && item.amount_cents !== 0)
  );
  const displayLineItems =
    invoiceLineItems.length > 0 ? invoiceLineItems : fallbackQuoteLineItems;
  const invoiceShortRef = formatInvoiceShortRef(invoice.id);
  const jobDescription = invoice.job_description || quote?.description || null;
  const isArchived = !!invoice.archived_at;
  const isCompleted = !!invoice.completed_at;

  const statusConfig = {
    draft: {
      label: 'Draft',
      icon: FileText,
      className: 'bg-muted text-muted-foreground',
      description: 'Review and adjust the final amount before sending',
    },
    sent: {
      label: 'Sent - Awaiting Payment',
      icon: Clock,
      className: 'bg-amber-500/20 text-amber-500',
      description: 'Waiting for customer to pay',
    },
    paid: {
      label: 'Paid',
      icon: CheckCircle,
      className: 'bg-green-500/20 text-green-500',
      description: 'Payment received',
    },
    overdue: {
      label: 'Overdue',
      icon: AlertTriangle,
      className: 'bg-red-500/20 text-red-500',
      description: 'Payment is past due',
    },
  };

  const status = isArchived
    ? {
        label: 'Archived',
        icon: Archive,
        className: 'bg-slate-500/20 text-slate-300',
        description: 'Hidden from active operational views',
      }
    : isCompleted
      ? {
          label: 'Completed',
          icon: CheckCircle,
          className: 'bg-blue-500/20 text-blue-400',
          description:
            invoice.status === 'paid'
              ? 'Job completed and payment received'
              : 'Job completed',
        }
      : statusConfig[invoice.status];
  const StatusIcon = status.icon;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/invoices"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to invoices"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{invoiceShortRef}</h1>
          <p className="truncate text-sm text-muted-foreground">for {displayName}</p>
        </div>
      </div>

      {/* Status */}
      <div className={`mb-6 rounded-lg p-4 ${status.className}`}>
        <div className="flex items-center gap-2">
          <StatusIcon size={20} />
          <span className="font-medium">{status.label}</span>
        </div>
        <p className="mt-1 text-sm opacity-80">{status.description}</p>
        {invoice.status === 'paid' && invoice.paid_at && (
          <p className="mt-1 text-sm opacity-80">
            Paid on {new Date(invoice.paid_at).toLocaleDateString()}
          </p>
        )}
        {invoice.status === 'sent' && invoice.sent_at && (
          <p className="mt-1 text-sm opacity-80">
            Sent on {new Date(invoice.sent_at).toLocaleDateString()}
          </p>
        )}
        {invoice.completed_at && (
          <p className="mt-1 text-sm opacity-80">
            Completed on {new Date(invoice.completed_at).toLocaleDateString()}
          </p>
        )}
        {invoice.archived_at && (
          <p className="mt-1 text-sm opacity-80">
            Archived on {new Date(invoice.archived_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="mb-6 rounded-lg border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">Amount Due</p>
        <p className="text-3xl font-bold sm:text-4xl">
          {formatCents(invoice.amount_cents)}
        </p>
      </div>

      <InvoiceReferenceCard invoiceId={invoice.id} />

      {invoice.status === 'draft' && !isArchived && (
        <DraftAmountEditor
          invoiceId={invoice.id}
          currentAmountCents={invoice.amount_cents}
          currentAdjustmentNote={invoice.adjustment_note}
          currentJobDescription={invoice.job_description ?? quote?.description ?? ''}
          quoteAmountCents={quote?.total_cents ?? null}
        />
      )}

      {jobDescription && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Job Description</p>
          <p className="mt-1 whitespace-pre-wrap">{jobDescription}</p>
        </div>
      )}

      {displayLineItems.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="mb-2 text-sm text-muted-foreground">Line Items</p>
          <div className="space-y-2">
            {displayLineItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="pr-3">{item.description}</span>
                <span className="font-medium tabular-nums">
                  {formatCents(item.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.adjustment_note && invoice.status !== 'draft' && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Adjustment Note</p>
          <p className="mt-1 whitespace-pre-wrap">{invoice.adjustment_note}</p>
        </div>
      )}

      {/* Customer Info */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User size={16} />
          <span>Customer</span>
        </div>
        <Link
          href={`/customers/${invoice.customer_id}`}
          className="mt-1 font-semibold hover:underline"
        >
          {displayName}
        </Link>
        {customer?.address && (
          <p className="text-sm text-muted-foreground">{customer.address}</p>
        )}
      </div>

      {/* Service Address */}
      {(invoice.service_address || quote?.service_address) && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={16} />
            <span>Service Address</span>
          </div>
          <p className="mt-1 font-medium">
            {invoice.service_address || quote?.service_address}
          </p>
        </div>
      )}

      {/* Related Quote */}
      {quote && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText size={16} />
            <span>Related Quote</span>
          </div>
          <Link
            href={`/quotes/${quote.id}`}
            className="mt-1 inline-flex items-center gap-2 font-semibold hover:underline"
          >
            View Quote
            <ExternalLink size={12} />
          </Link>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {quote.description}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCents(quote.total_cents)}
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={16} />
          <span>Timeline</span>
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            Created: {new Date(invoice.created_at).toLocaleDateString()}
          </p>
          {invoice.sent_at && (
            <p>Sent: {new Date(invoice.sent_at).toLocaleDateString()}</p>
          )}
          {invoice.paid_at && (
            <p className="text-green-500">
              Paid: {new Date(invoice.paid_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Payment Link (if exists and is safe) */}
      {isSafePaymentLink(invoice.stripe_payment_link) && invoice.status !== 'paid' && !isArchived && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Payment Link</p>
          <a
            href={invoice.stripe_payment_link!}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-2 text-accent hover:underline"
          >
            Open payment page
            <ExternalLink size={12} />
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this link with the customer if needed
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {invoice.status === 'draft' && !isArchived && (
          <SendInvoiceButton
            invoiceId={invoice.id}
            amountCents={invoice.amount_cents}
            adjustmentNote={invoice.adjustment_note}
          />
        )}

        {!isArchived && (invoice.status === 'sent' || invoice.status === 'overdue') && (
          <SendInvoiceButton
            invoiceId={invoice.id}
            isResend
            amountCents={invoice.amount_cents}
            adjustmentNote={invoice.adjustment_note}
          />
        )}

        {invoice.status !== 'draft' && !isArchived && (
          <CompleteInvoiceButton
            invoiceId={invoice.id}
            isCompleted={isCompleted}
          />
        )}

        <ArchiveInvoiceButton invoiceId={invoice.id} isArchived={isArchived} />

        {invoice.status === 'draft' && !isArchived && (
          <DeleteInvoiceButton invoiceId={invoice.id} />
        )}

        {invoice.status === 'paid' && (
          <div className="rounded-lg bg-green-500/10 p-4 text-center">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
            <p className="font-medium text-green-500">Payment Complete</p>
            {invoice.stripe_payment_id && (
              <p className="mt-1 text-xs text-muted-foreground">
                Payment ID: {invoice.stripe_payment_id.slice(0, 20)}...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
