import type { Invoice } from '@/lib/database.types';
import { formatCents } from '@/lib/utils/format-currency';
import { StatusBadge } from './status-badge';

interface InvoiceCardProps {
  invoice: Invoice;
  onClick?: () => void;
}

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
  void onClick;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Invoice</p>
        <StatusBadge status={invoice.status} />
      </div>
      <p className="text-lg font-bold">{formatCents(invoice.amount_cents)}</p>
    </div>
  );
}
