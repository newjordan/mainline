import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import { getCustomersWithLastMessage } from '@/lib/actions/customers';
import { CustomerCard } from '@/components/shared/customer-card';
import { Button } from '@/components/ui/button';

type SearchParams = Promise<{ filter?: string }>;

/**
 * Customers List Page
 *
 * Server Component that fetches and displays all customers
 * with their most recent message preview.
 *
 * Features:
 * - Sorted by most recent activity
 * - Unread indicator for inbound messages
 * - Filter by ?filter=unread for attention items
 * - Click through to customer detail
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { filter } = await searchParams;
  const result = await getCustomersWithLastMessage();

  if (!result.success) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Customers</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive">
            Failed to load customers. Please try again.
          </p>
        </div>
      </div>
    );
  }

  let customers = result.data;

  // Apply filter if specified
  if (filter === 'unread') {
    customers = customers.filter((c) => c.hasUnread);
  }

  const isFiltered = filter === 'unread';
  const unreadCount = result.data.filter((c) => c.hasUnread).length;

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>

          {isFiltered ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-amber-500">
                Showing {customers.length} with unread messages
              </span>
              <Link
                href="/customers"
                className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent/30"
              >
                <X className="h-3 w-3" />
                Clear filter
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-muted-foreground">
                {customers.length === 0
                  ? 'No customers yet. They will appear when they text you.'
                  : `${customers.length} customer${customers.length === 1 ? '' : 's'}`}
              </p>
              {unreadCount > 0 && (
                <Link
                  href="/customers?filter=unread"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-500 hover:bg-amber-500/30"
                >
                  {unreadCount} need{unreadCount === 1 ? 's' : ''} reply
                </Link>
              )}
            </div>
          )}
        </div>

        <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
          <Link href="/customers/new">
            <Plus className="mr-1 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            {isFiltered
              ? 'No customers with unread messages.'
              : "When customers text your business number, they'll appear here."}
          </p>
          {isFiltered && (
            <Link
              href="/customers"
              className="mt-2 inline-block text-sm text-accent underline"
            >
              View all customers
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
