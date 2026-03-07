import Link from 'next/link';
import { Users, FileText, Receipt, MessageSquare } from 'lucide-react';
import {
  globalSearch,
  type CustomerSearchResult,
  type QuoteSearchResult,
  type InvoiceSearchResult,
  type MessageSearchResult,
} from '@/lib/actions/search';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';

// =============================================================================
// Search Results Component
// =============================================================================
// Server component that fetches and displays search results grouped by type.
// =============================================================================

type SearchResultsProps = {
  query: string;
};

export async function SearchResults({ query }: SearchResultsProps) {
  // Show hint if query too short
  if (!query || query.length < 2) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Type at least 2 characters to search
        </p>
      </div>
    );
  }

  // Fetch results
  const result = await globalSearch(query);

  if (!result.success) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Search failed. Please try again.</p>
      </div>
    );
  }

  const { customers, quotes, invoices, messages } = result.data;
  const totalResults =
    customers.length + quotes.length + invoices.length + messages.length;

  // No results
  if (totalResults === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customers */}
      {customers.length > 0 && (
        <ResultSection
          title="Customers"
          icon={<Users className="h-5 w-5" />}
          count={customers.length}
        >
          {customers.map((customer: CustomerSearchResult) => (
            <CustomerResultCard key={customer.id} customer={customer} />
          ))}
        </ResultSection>
      )}

      {/* Quotes */}
      {quotes.length > 0 && (
        <ResultSection
          title="Quotes"
          icon={<FileText className="h-5 w-5" />}
          count={quotes.length}
        >
          {quotes.map((quote: QuoteSearchResult) => (
            <QuoteResultCard key={quote.id} quote={quote} />
          ))}
        </ResultSection>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <ResultSection
          title="Invoices"
          icon={<Receipt className="h-5 w-5" />}
          count={invoices.length}
        >
          {invoices.map((invoice: InvoiceSearchResult) => (
            <InvoiceResultCard key={invoice.id} invoice={invoice} />
          ))}
        </ResultSection>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <ResultSection
          title="Messages"
          icon={<MessageSquare className="h-5 w-5" />}
          count={messages.length}
        >
          {messages.map((message: MessageSearchResult) => (
            <MessageResultCard key={message.id} message={message} />
          ))}
        </ResultSection>
      )}
    </div>
  );
}

// =============================================================================
// Result Section Wrapper
// =============================================================================

type ResultSectionProps = {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
};

function ResultSection({ title, icon, count, children }: ResultSectionProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span className="font-medium">{title}</span>
        <span>({count})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

// =============================================================================
// Result Card Components
// =============================================================================

function CustomerResultCard({ customer }: { customer: CustomerSearchResult }) {
  const displayName = customer.name || formatPhoneNumber(customer.phone_number);

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <p className="truncate font-medium">{displayName}</p>
      {customer.name && (
        <p className="text-sm text-muted-foreground">
          {formatPhoneNumber(customer.phone_number)}
        </p>
      )}
      {customer.email && (
        <p className="text-sm text-muted-foreground">{customer.email}</p>
      )}
      {customer.address && (
        <p className="text-sm text-muted-foreground line-clamp-1">
          {customer.address}
        </p>
      )}
    </Link>
  );
}

function QuoteResultCard({ quote }: { quote: QuoteSearchResult }) {
  const customerName =
    quote.customer?.name ||
    (quote.customer?.phone_number
      ? formatPhoneNumber(quote.customer.phone_number)
      : 'Unknown');

  const statusColors: Record<string, string> = {
    draft: 'text-muted-foreground',
    sent: 'text-amber-500',
    accepted: 'text-green-500',
    rejected: 'text-red-500',
  };

  return (
    <Link
      href={`/quotes/${quote.id}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{quote.short_ref}</p>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {quote.description}
          </p>
          <p className="truncate text-xs text-muted-foreground">for {customerName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap font-semibold tabular-nums">
            {formatCents(quote.total_cents)}
          </p>
          <p className={`text-xs ${statusColors[quote.status] || ''}`}>
            {quote.status}
          </p>
        </div>
      </div>
    </Link>
  );
}

function InvoiceResultCard({ invoice }: { invoice: InvoiceSearchResult }) {
  const customerName =
    invoice.customer?.name ||
    (invoice.customer?.phone_number
      ? formatPhoneNumber(invoice.customer.phone_number)
      : 'Unknown');
  const shortRef = formatInvoiceShortRef(invoice.id);

  const statusColors: Record<string, string> = {
    draft: 'text-muted-foreground',
    sent: 'text-amber-500',
    paid: 'text-green-500',
    overdue: 'text-red-500',
  };

  return (
    <Link
      href={`/invoices/${invoice.id}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{shortRef}</p>
          <p className="truncate text-xs text-muted-foreground">for {customerName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(invoice.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap font-semibold tabular-nums">
            {formatCents(invoice.amount_cents)}
          </p>
          <p className={`text-xs ${statusColors[invoice.status] || ''}`}>
            {invoice.status}
          </p>
        </div>
      </div>
    </Link>
  );
}

function MessageResultCard({ message }: { message: MessageSearchResult }) {
  const customerName =
    message.customer?.name ||
    (message.customer?.phone_number
      ? formatPhoneNumber(message.customer.phone_number)
      : 'Unknown');

  return (
    <Link
      href={`/customers/${message.customer_id}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{customerName}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            &ldquo;{message.body}&rdquo;
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </Link>
  );
}
