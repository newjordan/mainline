import Link from 'next/link';
import { Wrench } from 'lucide-react';
import type { CustomerWithLastMessage } from '@/lib/actions/customers';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatRelativeTime } from '@/lib/utils/format-date';

interface CustomerCardProps {
  customer: CustomerWithLastMessage;
}

/**
 * Customer card for list view
 *
 * Shows:
 * - Customer name/phone
 * - Last message preview with timestamp
 * - Unread indicator (left border)
 * - New vs returning indicator
 * - Unit info for returning customers (context)
 */
export function CustomerCard({ customer }: CustomerCardProps) {
  const displayName = customer.name || formatPhoneNumber(customer.phone_number);
  const preview = customer.lastMessage?.body || 'No messages yet';
  const timeAgo = customer.lastMessage
    ? formatRelativeTime(customer.lastMessage.created_at)
    : formatRelativeTime(customer.created_at);
  const needsReply = customer.hasUnread;

  return (
    <Link href={`/customers/${customer.id}`} className="block">
      <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="truncate font-medium">{displayName}</p>
            {/* New vs Returning indicator */}
            {customer.isNew ? (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                New
              </span>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">
                {customer.messageCount} msgs
              </span>
            )}
            {needsReply && (
              <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-500">
                Needs reply
              </span>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo}
          </span>
        </div>

        {/* Message preview */}
        <p
          className={`mt-1 truncate text-sm ${
            needsReply ? 'font-medium text-foreground' : 'text-muted-foreground'
          }`}
        >
          {customer.lastMessage?.direction === 'outbound' ? (
            <span className="text-foreground/70">You: </span>
          ) : (
            customer.lastMessage && <span className="text-amber-500">Customer: </span>
          )}
          {preview}
        </p>

        {/* Context info for returning customers */}
        {!customer.isNew && (customer.unit_info || customer.name) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {customer.name && (
              <span className="shrink-0">{formatPhoneNumber(customer.phone_number)}</span>
            )}
            {customer.unit_info && (
              <span className="flex min-w-0 items-center gap-1">
                <Wrench className="h-3 w-3" />
                <span className="line-clamp-1">{customer.unit_info}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
