import Link from 'next/link';
import { MessageSquare, FileText, Receipt, CheckCircle, Plus } from 'lucide-react';
import { AttentionCard } from '@/components/dashboard/attention-card';
import { getDemoAttentionCounts } from '@/lib/demo/demo-data';
import { buildDemoNewInvoicePath, buildDemoNewQuotePath } from '@/lib/demo-paths';

export default function DemoHomePage() {
  const counts = getDemoAttentionCounts();
  const totalAttention =
    counts.unreadMessages + counts.pendingQuotes + counts.outstandingInvoices;

  return (
    <div className="p-4">
      <h1 className="mb-1 text-2xl font-bold">Dashboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        This is simulated dashboard data for a first-drive evaluation.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href={buildDemoNewQuotePath()}
          className="flex min-h-[64px] items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="text-sm text-muted-foreground">Quick Action</p>
            <p className="font-semibold">Create Quote</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href={buildDemoNewInvoicePath()}
          className="flex min-h-[64px] items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="text-sm text-muted-foreground">Quick Action</p>
            <p className="font-semibold">Create Invoice</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {totalAttention === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">All Clear!</h2>
          <p className="text-muted-foreground">Nothing needs attention right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {counts.unreadMessages > 0 && (
            <AttentionCard
              count={counts.unreadMessages}
              label="messages need your attention"
              singularLabel="message needs your attention"
              href="/demo/customers?filter=unread"
              icon={MessageSquare}
              variant="warning"
            />
          )}

          {counts.pendingQuotes > 0 && (
            <AttentionCard
              count={counts.pendingQuotes}
              label="quotes pending acceptance"
              singularLabel="quote pending acceptance"
              href="/demo/quotes?view=needs-follow-up&status=sent"
              icon={FileText}
              variant="default"
            />
          )}

          {counts.outstandingInvoices > 0 && (
            <AttentionCard
              count={counts.outstandingInvoices}
              label="invoices outstanding"
              singularLabel="invoice outstanding"
              href="/demo/invoices?view=awaiting-payment&status=overdue"
              icon={Receipt}
              variant="warning"
            />
          )}
        </div>
      )}
    </div>
  );
}
