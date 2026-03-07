'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendInvoice, resendInvoice } from '@/lib/actions/invoices';
import { formatCents } from '@/lib/utils/format-currency';
import { toast } from 'sonner';

interface SendInvoiceButtonProps {
  invoiceId: string;
  isResend?: boolean;
  amountCents?: number;
  adjustmentNote?: string | null;
}

/**
 * Client component for sending/resending invoices
 *
 * Features:
 * - Confirmation dialog before sending (irreversible action)
 * - Shows appropriate toast based on SMS delivery status
 * - Loading state prevents double-click
 */
export function SendInvoiceButton({
  invoiceId,
  isResend = false,
  amountCents,
  adjustmentNote,
}: SendInvoiceButtonProps) {
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setShowConfirm(true);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const result = isResend
        ? await resendInvoice(invoiceId)
        : await sendInvoice(invoiceId);

      if (result.success) {
        toast.success(isResend ? 'Invoice resent!' : 'Invoice sent!');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to send invoice');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invoice';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const label = isResend ? 'Resend Invoice' : 'Send Invoice';
  const loadingLabel = isResend ? 'Resending...' : 'Sending...';

  // Confirmation dialog
  if (showConfirm) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-500">
              {isResend ? 'Resend this invoice?' : 'Send this invoice?'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This will {isResend ? 'create a new payment link and send another SMS' : 'create a payment link and send an SMS'} to the customer.
            </p>
            {typeof amountCents === 'number' && (
              <p className="mt-1 text-sm font-medium text-foreground">
                Amount to send: {formatCents(amountCents)}
              </p>
            )}
            {adjustmentNote && (
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                Note: {adjustmentNote}
              </p>
            )}
            {!isResend && (
              <p className="mt-1 text-xs text-muted-foreground">
                The invoice amount locks after sending.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            onClick={handleCancel}
            variant="outline"
            size="lg"
            className="w-full sm:flex-1"
            aria-label="Cancel sending invoice"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            size="lg"
            className="w-full sm:flex-1"
            aria-label={`Confirm ${isResend ? 'resending' : 'sending'} invoice`}
          >
            Yes, {isResend ? 'Resend' : 'Send'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={sending}
      className="w-full"
      size="lg"
      variant={isResend ? 'outline' : 'default'}
      aria-label={label}
    >
      <Send size={16} className="mr-2" />
      {sending ? loadingLabel : label}
    </Button>
  );
}
