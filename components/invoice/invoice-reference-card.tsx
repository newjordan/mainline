'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  buildInvoicePaymentNote,
  formatInvoiceShortRef,
} from '@/lib/utils/invoice-reference';

interface InvoiceReferenceCardProps {
  invoiceId: string;
}

type CopyTarget = 'uuid' | 'note' | null;

export function InvoiceReferenceCard({ invoiceId }: InvoiceReferenceCardProps) {
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);
  const shortRef = formatInvoiceShortRef(invoiceId);
  const paymentNote = buildInvoicePaymentNote(invoiceId);

  const copyValue = async (target: Exclude<CopyTarget, null>, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget((current) => (current === target ? null : current)), 1500);
      toast.success(target === 'uuid' ? 'Invoice UUID copied' : 'Square note copied');
    } catch {
      toast.error('Copy failed - please copy manually');
    }
  };

  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">Invoice Reference</p>
      <p className="mt-1 text-lg font-semibold">{shortRef}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Standard format for quick reference: INV-XXXXXX
      </p>

      <div className="mt-3 space-y-3">
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Invoice UUID</p>
          <p className="mt-1 break-all font-mono text-xs">{invoiceId}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 h-8"
            onClick={() => copyValue('uuid', invoiceId)}
          >
            {copiedTarget === 'uuid' ? <Check /> : <Copy />}
            Copy UUID
          </Button>
        </div>

        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Square Reader Note</p>
          <p className="mt-1 break-all font-mono text-xs">{paymentNote}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 h-8"
            onClick={() => copyValue('note', paymentNote)}
          >
            {copiedTarget === 'note' ? <Check /> : <Copy />}
            Copy Note
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste this note in Square on card-reader payments so the app auto-matches the payment.
          </p>
        </div>
      </div>
    </div>
  );
}

