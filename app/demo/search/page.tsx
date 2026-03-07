import Link from 'next/link';
import { Users, FileText, Receipt, MessageSquare } from 'lucide-react';
import { searchDemoData, getDemoCustomerLabel } from '@/lib/demo/demo-data';
import {
  DEMO_SEARCH_PATH,
  getDemoCustomerPath,
  getDemoInvoicePath,
  getDemoQuotePath,
} from '@/lib/demo-paths';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';

type SearchParams = Promise<{ q?: string }>;

export default async function DemoSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  const results = searchDemoData(query);
  const totalResults =
    results.customers.length +
    results.quotes.length +
    results.invoices.length +
    results.messages.length;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Search</h1>

      <form action={DEMO_SEARCH_PATH} method="get" className="mb-6 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search customers, quotes, invoices, messages"
          className="h-12 flex-1 rounded-lg border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Search
        </button>
      </form>

      {query.length < 2 ? (
        <p className="py-12 text-center text-muted-foreground">
          Type at least 2 characters to search demo data.
        </p>
      ) : totalResults === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="space-y-6">
          {results.customers.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Customers ({results.customers.length})</span>
              </div>
              <div className="space-y-2">
                {results.customers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={getDemoCustomerPath(customer.id)}
                    className="block rounded-lg border bg-card p-3 hover:bg-muted/50"
                  >
                    <p className="font-medium">
                      {customer.name || formatPhoneNumber(customer.phone_number)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhoneNumber(customer.phone_number)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.quotes.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Quotes ({results.quotes.length})</span>
              </div>
              <div className="space-y-2">
                {results.quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={getDemoQuotePath(quote.id)}
                    className="block rounded-lg border bg-card p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{quote.short_ref}</p>
                        <p className="text-sm text-muted-foreground">{quote.description}</p>
                        <p className="text-xs text-muted-foreground">
                          for {getDemoCustomerLabel(quote.customer_id)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCents(quote.total_cents)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.invoices.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>Invoices ({results.invoices.length})</span>
              </div>
              <div className="space-y-2">
                {results.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={getDemoInvoicePath(invoice.id)}
                    className="block rounded-lg border bg-card p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{formatInvoiceShortRef(invoice.id)}</p>
                        <p className="text-xs text-muted-foreground">
                          for {getDemoCustomerLabel(invoice.customer_id)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCents(invoice.amount_cents)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.messages.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Messages ({results.messages.length})</span>
              </div>
              <div className="space-y-2">
                {results.messages.map((message) => (
                  <Link
                    key={message.id}
                    href={getDemoCustomerPath(message.customer_id)}
                    className="block rounded-lg border bg-card p-3 hover:bg-muted/50"
                  >
                    <p className="font-medium">{getDemoCustomerLabel(message.customer_id)}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{message.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(message.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
