import { MessageSquare, FileText, Receipt, CheckCircle } from 'lucide-react';
import { getAttentionCounts } from '@/app/actions/dashboard';
import { AttentionCard } from '@/components/dashboard/attention-card';

/**
 * Dashboard Home Page
 *
 * Shows "attention items" - things the admin needs to act on:
 * - Unread messages (customers waiting for response)
 * - Pending quotes (sent but not accepted)
 * - Outstanding invoices (sent or overdue)
 *
 * Goal: Answer "what needs my attention?" in 5 seconds.
 */
export default async function DashboardPage() {
  const counts = await getAttentionCounts();
  const totalAttention =
    counts.unreadMessages + counts.pendingQuotes + counts.outstandingInvoices;

  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {totalAttention === 0 ? (
        // All clear state
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">All Clear!</h2>
          <p className="text-muted-foreground">
            Nothing needs your attention right now.
          </p>
        </div>
      ) : (
        // Attention items
        <div className="space-y-3">
          {counts.unreadMessages > 0 && (
            <AttentionCard
              count={counts.unreadMessages}
              label="messages need your attention"
              singularLabel="message needs your attention"
              href="/customers?filter=unread"
              icon={MessageSquare}
              variant="warning"
            />
          )}

          {counts.pendingQuotes > 0 && (
            <AttentionCard
              count={counts.pendingQuotes}
              label="quotes pending acceptance"
              singularLabel="quote pending acceptance"
              href="/quotes?filter=pending"
              icon={FileText}
              variant="default"
            />
          )}

          {counts.outstandingInvoices > 0 && (
            <AttentionCard
              count={counts.outstandingInvoices}
              label="invoices outstanding"
              singularLabel="invoice outstanding"
              href="/invoices?filter=outstanding"
              icon={Receipt}
              variant="warning"
            />
          )}
        </div>
      )}
    </div>
  );
}
