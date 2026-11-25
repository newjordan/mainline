import { formatCents } from '@/lib/utils/format-currency';
import {
  formatTaxRate,
  type DocumentTotals,
} from '@/lib/documents/calculations';

export function MoneyTotal({
  totals,
  label = 'Total',
  emphasizeInvalid = false,
}: {
  totals: DocumentTotals;
  label?: string;
  emphasizeInvalid?: boolean;
}) {
  const invalid = emphasizeInvalid && totals.totalCents <= 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      {totals.taxCents !== 0 ? (
        <div className="mb-2 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCents(totals.subtotalCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax ({formatTaxRate(totals.taxRateBps)})</span>
            <span>{formatCents(totals.taxCents)}</span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={`text-2xl font-bold ${invalid ? 'text-destructive' : ''}`}>
          {formatCents(totals.totalCents)}
        </span>
      </div>
    </div>
  );
}
