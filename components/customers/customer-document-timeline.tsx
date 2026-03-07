import Link from 'next/link';
import { Clock3, FileText, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/utils/format-currency';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';
import { cn } from '@/lib/utils';

type TimelineQuote = {
  id: string;
  short_ref: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  total_cents: number;
  created_at: string;
  completed_at: string | null;
  archived_at: string | null;
};

type TimelineInvoice = {
  id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
};

type TimelineEntry = {
  id: string;
  href: string;
  kind: 'quote' | 'invoice';
  createdAt: string;
  title: string;
  amountCents: number;
  status: string;
  note: string | null;
};

interface CustomerDocumentTimelineProps {
  customerId: string;
  className?: string;
}

function buildQuoteNote(quote: TimelineQuote): string | null {
  if (quote.archived_at) return 'Archived';
  if (quote.completed_at) return `Completed ${new Date(quote.completed_at).toLocaleDateString()}`;
  return null;
}

function buildInvoiceNote(invoice: TimelineInvoice): string | null {
  if (invoice.archived_at) return 'Archived';
  if (invoice.paid_at) return `Paid ${new Date(invoice.paid_at).toLocaleDateString()}`;
  if (invoice.completed_at) {
    return `Completed ${new Date(invoice.completed_at).toLocaleDateString()}`;
  }
  return null;
}

/**
 * Mixed quote + invoice timeline for a single customer.
 */
export async function CustomerDocumentTimeline({
  customerId,
  className,
}: CustomerDocumentTimelineProps) {
  const supabase = await createClient();

  const [quotesResult, invoicesResult] = await Promise.all([
    supabase
      .from('quotes')
      .select(
        'id, short_ref, status, total_cents, created_at, completed_at, archived_at'
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('invoices')
      .select(
        'id, status, amount_cents, created_at, paid_at, completed_at, archived_at'
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const quotes = (quotesResult.data ?? []) as TimelineQuote[];
  const invoices = (invoicesResult.data ?? []) as TimelineInvoice[];

  const entries: TimelineEntry[] = [
    ...quotes.map((quote) => ({
      id: `quote-${quote.id}`,
      href: `/quotes/${quote.id}`,
      kind: 'quote' as const,
      createdAt: quote.created_at,
      title: quote.short_ref,
      amountCents: quote.total_cents,
      status: quote.completed_at ? 'completed' : quote.status,
      note: buildQuoteNote(quote),
    })),
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      href: `/invoices/${invoice.id}`,
      kind: 'invoice' as const,
      createdAt: invoice.created_at,
      title: formatInvoiceShortRef(invoice.id),
      amountCents: invoice.amount_cents,
      status: invoice.completed_at ? 'completed' : invoice.status,
      note: buildInvoiceNote(invoice),
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <section className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Customer Timeline</h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quote or invoice activity yet.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className="block rounded-md border bg-background/40 p-3 hover:bg-accent/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {entry.kind === 'quote' ? (
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()} • {entry.status}
                  </p>
                  {entry.note && (
                    <p className="text-xs text-muted-foreground">{entry.note}</p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCents(entry.amountCents)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
