import { cn } from '@/lib/utils';

type Status =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'overdue'
  | 'delivered'
  | 'failed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[status] || 'bg-gray-100 text-gray-800',
        className
      )}
    >
      {status}
    </span>
  );
}
