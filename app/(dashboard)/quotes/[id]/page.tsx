import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  User,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
} from 'lucide-react';
import { getQuote } from '@/lib/actions/quotes';
import { getCustomer } from '@/lib/actions/customers';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import type { QuoteLineItem } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { SendQuoteButton } from '@/components/quotes/send-quote-button';
import { AcceptQuoteButton } from '@/components/quotes/accept-quote-button';
import { DeleteQuoteButton } from '@/components/quotes/delete-quote-button';
import { CompleteQuoteButton } from '@/components/quotes/complete-quote-button';
import { ArchiveQuoteButton } from '@/components/quotes/archive-quote-button';
import { getActiveQuoteToken, createQuoteAccessToken } from '@/lib/utils/quote-tokens';

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Quote Detail Page (Dashboard)
 *
 * Shows full quote details with actions:
 * - View as customer
 * - Send/Resend quote
 * - Create invoice (if accepted)
 */
export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params;

  const quoteResult = await getQuote(id);

  if (!quoteResult.success || !quoteResult.data) {
    notFound();
  }

  const quote = quoteResult.data;

  // Fetch customer info
  const customerResult = await getCustomer(quote.customer_id);
  const customer = customerResult.success ? customerResult.data : null;

  // Get or create an access token for "View as Customer" link
  let quoteToken = await getActiveQuoteToken(id);
  if (!quoteToken) {
    const tokenResult = await createQuoteAccessToken(id);
    if (tokenResult.success) {
      quoteToken = tokenResult.data;
    }
  }

  const lineItems = (quote.line_items as QuoteLineItem[]) || [];
  const serviceAddress =
    quote.service_address?.trim() || customer?.address?.trim() || null;
  const displayName =
    customer?.name || (customer?.phone_number ? formatPhoneNumber(customer.phone_number) : 'Unknown');
  const isSuperseded = !!quote.superseded_at;
  const isArchived = !!quote.archived_at;
  const isCompleted = !!quote.completed_at;
  const isOperational = !isSuperseded && !isArchived;

  const statusConfig = {
    draft: {
      label: 'Draft',
      icon: FileText,
      className: 'bg-muted text-muted-foreground',
    },
    sent: {
      label: 'Sent - Pending',
      icon: Clock,
      className: 'bg-amber-500/20 text-amber-500',
    },
    accepted: {
      label: 'Accepted',
      icon: CheckCircle,
      className: 'bg-green-500/20 text-green-500',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-500/20 text-red-500',
    },
  };

  const status = isSuperseded
    ? {
        label: 'Superseded',
        icon: Clock,
        className: 'bg-amber-500/20 text-amber-500',
      }
    : isArchived
      ? {
          label: 'Archived',
          icon: Archive,
          className: 'bg-slate-500/20 text-slate-300',
        }
      : isCompleted
        ? {
            label: 'Completed',
            icon: CheckCircle,
            className: 'bg-blue-500/20 text-blue-400',
          }
    : statusConfig[quote.status];
  const StatusIcon = status.icon;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/quotes"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Back to quotes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Quote</h1>
            <p className="truncate text-sm text-muted-foreground">
              for {displayName}
            </p>
          </div>
        </div>
        {quoteToken ? (
          <Link
            href={`/q/${quoteToken}`}
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent/10 sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            View as Customer
          </Link>
        ) : (
          <span className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground sm:w-auto">
            <ExternalLink className="h-4 w-4" />
            No preview available
          </span>
        )}
      </div>

      {/* Status */}
      <div
        className={`mb-6 flex items-center gap-2 rounded-lg p-3 ${status.className}`}
      >
        <StatusIcon className="h-5 w-5" />
        <span className="font-medium">{status.label}</span>
        {quote.accepted_at && quote.status === 'accepted' && (
          <span className="text-sm opacity-80">
            on {new Date(quote.accepted_at).toLocaleDateString()}
          </span>
        )}
        {quote.completed_at && (
          <span className="text-sm opacity-80">
            completed {new Date(quote.completed_at).toLocaleDateString()}
          </span>
        )}
        {quote.archived_at && (
          <span className="text-sm opacity-80">
            archived {new Date(quote.archived_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Customer Info */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Customer</span>
        </div>
        <Link
          href={`/customers/${quote.customer_id}`}
          className="mt-1 font-semibold hover:underline"
        >
          {displayName}
        </Link>
        {serviceAddress && (
          <p className="text-sm text-muted-foreground">
            Service Address: {serviceAddress}
          </p>
        )}
      </div>

      {/* Quote Details */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Created {new Date(quote.created_at).toLocaleDateString()}
          </span>
        </div>

        <h2 className="mb-2 font-medium">Job Description</h2>
        <p className="mb-4 whitespace-pre-wrap text-muted-foreground">
          {quote.description}
        </p>

        <h2 className="mb-2 font-medium">Line Items</h2>
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-border/50 py-2 last:border-0"
            >
              <span className="min-w-0 flex-1 pr-3">{item.description}</span>
              <span className="shrink-0 whitespace-nowrap font-medium tabular-nums">
                {formatCents(item.amount_cents)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-bold">
            {formatCents(quote.total_cents)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {quote.status === 'draft' && isOperational && (
          <SendQuoteButton quoteId={id} />
        )}

        {quote.status === 'accepted' && isOperational && (
          <CompleteQuoteButton quoteId={id} isCompleted={isCompleted} />
        )}

        {quote.status === 'accepted' && isOperational && (
          <Button className="w-full" size="lg" asChild>
            <Link href={`/invoices/new?quote=${id}`}>
              Create Invoice
            </Link>
          </Button>
        )}

        {quote.status === 'sent' && isOperational && (
          <>
            <SendQuoteButton quoteId={id} isResend />
            <AcceptQuoteButton quoteId={id} />
          </>
        )}

        {(quote.status === 'draft' || quote.status === 'sent' || quote.status === 'rejected') &&
          isOperational && (
            <Button className="w-full" size="lg" variant="outline" asChild>
              <Link href={`/quotes/${id}/edit`}>Edit Quote</Link>
            </Button>
          )}

        {!isSuperseded && (
          <ArchiveQuoteButton quoteId={id} isArchived={isArchived} />
        )}

        {!isSuperseded && <DeleteQuoteButton quoteId={id} />}
      </div>
    </div>
  );
}
