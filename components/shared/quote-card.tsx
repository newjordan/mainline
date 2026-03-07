import type { Quote } from '@/lib/database.types';
import { formatCents } from '@/lib/utils/format-currency';
import { StatusBadge } from './status-badge';

interface QuoteCardProps {
  quote: Quote;
  onClick?: () => void;
}

export function QuoteCard({ quote, onClick }: QuoteCardProps) {
  void onClick;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{quote.description}</p>
        <StatusBadge status={quote.status} />
      </div>
      <p className="text-lg font-bold">{formatCents(quote.total_cents)}</p>
    </div>
  );
}
