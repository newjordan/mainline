import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { getDemoCustomerLabel, getDemoQuotes, type DemoQuote } from '@/lib/demo/demo-data';
import { buildDemoNewQuotePath, buildDemoQuotesHref, getDemoQuotePath } from '@/lib/demo-paths';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils/format-currency';

type QuoteSavedView =
  | 'all'
  | 'needs-follow-up'
  | 'awaiting-payment'
  | 'recently-completed'
  | 'archived';
type QuoteStatusFilter = 'any' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'completed';

type SearchParams = Promise<{
  view?: string;
  status?: string;
  customer?: string;
  q?: string;
}>;

function normalizeView(input?: string): QuoteSavedView {
  const value = (input ?? '').trim();
  if (
    value === 'needs-follow-up' ||
    value === 'awaiting-payment' ||
    value === 'recently-completed' ||
    value === 'archived'
  ) {
    return value;
  }
  return 'all';
}

function normalizeStatus(input?: string): QuoteStatusFilter {
  const value = (input ?? '').trim();
  if (
    value === 'draft' ||
    value === 'sent' ||
    value === 'accepted' ||
    value === 'rejected' ||
    value === 'completed'
  ) {
    return value;
  }
  return 'any';
}

function filterQuotes(
  quotes: DemoQuote[],
  view: QuoteSavedView,
  status: QuoteStatusFilter,
  customerId?: string,
  query?: string
): DemoQuote[] {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const searchTerm = (query ?? '').trim().toLowerCase();

  return quotes.filter((quote) => {
    if (customerId && quote.customer_id !== customerId) return false;

    if (view === 'needs-follow-up' && (quote.status !== 'sent' || quote.archived_at)) {
      return false;
    }
    if (
      view === 'awaiting-payment' &&
      (quote.status !== 'accepted' || quote.completed_at || quote.archived_at)
    ) {
      return false;
    }
    if (view === 'recently-completed') {
      if (!quote.completed_at) return false;
      if (new Date(quote.completed_at).getTime() < thirtyDaysAgo) return false;
    }
    if (view === 'archived' && !quote.archived_at) return false;
    if (view === 'all' && quote.archived_at) return false;

    if (status === 'completed' && !quote.completed_at) return false;
    if (status !== 'any' && status !== 'completed' && quote.status !== status) return false;

    if (searchTerm) {
      const haystack = [
        quote.short_ref,
        quote.description,
        getDemoCustomerLabel(quote.customer_id),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }

    return true;
  });
}

export default async function DemoQuotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = normalizeView(params.view);
  const status = normalizeStatus(params.status);
  const customerId = params.customer?.trim() || undefined;
  const query = params.q?.trim() || '';
  const quotes = filterQuotes(getDemoQuotes(), view, status, customerId, query);

  const groups = new Map<string, DemoQuote[]>();
  for (const quote of quotes) {
    const current = groups.get(quote.customer_id) ?? [];
    current.push(quote);
    groups.set(quote.customer_id, current);
  }

  const savedViewTabs: { key: QuoteSavedView; label: string }[] = [
    { key: 'all', label: 'All Active' },
    { key: 'needs-follow-up', label: 'Needs Follow-up' },
    { key: 'awaiting-payment', label: 'Awaiting Payment' },
    { key: 'recently-completed', label: 'Recently Completed' },
    { key: 'archived', label: 'Archived' },
  ];

  const statusTabs: { key: QuoteStatusFilter; label: string }[] = [
    { key: 'any', label: 'Any Status' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Quotes</h1>
          <p className="text-sm text-muted-foreground">Read-only simulated workflow</p>
        </div>
        <Button asChild className="h-11 shrink-0 px-4 text-sm">
          <Link href={buildDemoNewQuotePath({ customer: customerId })}>
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>

      <form className="mb-3 flex gap-2" action="/demo/quotes" method="get">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search quote ref, customer, description"
          className="h-11 flex-1 rounded-lg border bg-background px-3 text-sm"
        />
        {view !== 'all' && <input type="hidden" name="view" value={view} />}
        {status !== 'any' && <input type="hidden" name="status" value={status} />}
        {customerId && <input type="hidden" name="customer" value={customerId} />}
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Search
        </button>
      </form>

      <div className="mb-2">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Views
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          {savedViewTabs.map((tab) => {
            const active = tab.key === view;
            return (
              <Link
                key={tab.key}
                href={buildDemoQuotesHref({
                  view: tab.key,
                  status,
                  customer: customerId,
                  q: query || undefined,
                })}
                className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Status
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const active = tab.key === status;
            return (
              <Link
                key={tab.key}
                href={buildDemoQuotesHref({
                  view,
                  status: tab.key,
                  customer: customerId,
                  q: query || undefined,
                })}
                className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
                  active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No demo quotes match this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([groupCustomerId, groupQuotes]) => (
            <section key={groupCustomerId} className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <p className="font-semibold">{getDemoCustomerLabel(groupCustomerId)}</p>
                <p className="text-xs text-muted-foreground">
                  {groupQuotes.length} quote{groupQuotes.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="space-y-2 p-3">
                {groupQuotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={getDemoQuotePath(quote.id)}
                    className="block rounded-md border bg-background/40 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{quote.short_ref}</p>
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {quote.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quote.completed_at ? 'completed' : quote.archived_at ? 'archived' : quote.status}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatCents(quote.total_cents)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
