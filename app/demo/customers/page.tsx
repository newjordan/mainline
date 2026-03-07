import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDemoCustomersWithLastMessage } from '@/lib/demo/demo-data';
import {
  buildDemoCustomersHref,
  buildDemoNewCustomerPath,
  getDemoCustomerPath,
} from '@/lib/demo-paths';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatRelativeTime } from '@/lib/utils/format-date';

type SearchParams = Promise<{ filter?: string }>;

export default async function DemoCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { filter } = await searchParams;
  const allCustomers = getDemoCustomersWithLastMessage();
  const customers =
    filter === 'unread'
      ? allCustomers.filter((customer) => customer.hasUnread)
      : allCustomers;

  const unreadCount = allCustomers.filter((customer) => customer.hasUnread).length;
  const isFiltered = filter === 'unread';

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          {isFiltered ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-amber-500">
                Showing {customers.length} customer{customers.length === 1 ? '' : 's'} needing a
                reply
              </span>
              <Link
                href={buildDemoCustomersHref()}
                className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent/30"
              >
                <X className="h-3 w-3" />
                Clear filter
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-muted-foreground">
                {customers.length} customer{customers.length === 1 ? '' : 's'}
              </p>
              {unreadCount > 0 && (
                <Link
                  href={buildDemoCustomersHref({ filter: 'unread' })}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-500 hover:bg-amber-500/30"
                >
                  {unreadCount} need{unreadCount === 1 ? 's' : ''} reply
                </Link>
              )}
            </div>
          )}
        </div>

        <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
          <Link href={buildDemoNewCustomerPath()}>
            <Plus className="mr-1 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {customers.map((customer) => {
          const displayName = customer.name || formatPhoneNumber(customer.phone_number);
          const preview = customer.lastMessage?.body || 'No messages yet';
          const timeAgo = customer.lastMessage
            ? formatRelativeTime(customer.lastMessage.created_at)
            : formatRelativeTime(customer.created_at);

          return (
            <Link key={customer.id} href={getDemoCustomerPath(customer.id)} className="block">
              <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <p className="truncate font-medium">{displayName}</p>
                    {customer.isNew ? (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                        New
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {customer.messageCount} msgs
                      </span>
                    )}
                    {customer.hasUnread && (
                      <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-500">
                        Needs reply
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
                </div>

                <p
                  className={`mt-1 truncate text-sm ${
                    customer.hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {customer.lastMessage?.direction === 'outbound' ? (
                    <span className="text-foreground/70">You: </span>
                  ) : (
                    customer.lastMessage && <span className="text-amber-500">Customer: </span>
                  )}
                  {preview}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
