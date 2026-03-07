'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  buildDemoNewInvoicePath,
  buildDemoNewQuotePath,
  buildDemoQuoteDocumentPath,
} from '@/lib/demo-paths';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  RotateCcw,
  Send,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DemoCustomer, DemoQuote } from '@/lib/demo/demo-data';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';

interface DemoQuoteDetailProps {
  customer: DemoCustomer;
  quote: DemoQuote;
}

type SimulatedQuoteStatus = DemoQuote['status'];

export function DemoQuoteDetail({ customer, quote }: DemoQuoteDetailProps) {
  const [status, setStatus] = useState<SimulatedQuoteStatus>(quote.status);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(quote.accepted_at);
  const [completedAt, setCompletedAt] = useState<string | null>(quote.completed_at);

  const displayName = customer.name || formatPhoneNumber(customer.phone_number);
  const confirmationCode = useMemo(() => {
    const digits = quote.short_ref.replace(/\D/g, '');
    return digits.slice(-4) || '1042';
  }, [quote.short_ref]);
  const isCompleted = !!completedAt;

  const statusCard = isCompleted
    ? {
        label: 'Completed',
        description: 'The work is wrapped and ready for final billing or archival.',
        className: 'bg-blue-500/15 text-blue-300',
        icon: CheckCircle2,
      }
    : {
        draft: {
          label: 'Draft',
          description: 'Still internal. Nothing has been texted to the customer yet.',
          className: 'bg-muted text-muted-foreground',
          icon: FileText,
        },
        sent: {
          label: 'Sent - Awaiting Customer',
          description: 'Customer has the quote by text. You can resend or mark it accepted from a call.',
          className: 'bg-amber-500/15 text-amber-300',
          icon: Clock3,
        },
        accepted: {
          label: 'Accepted',
          description: 'Approved and ready to move into final invoice prep.',
          className: 'bg-green-500/15 text-green-300',
          icon: CheckCircle2,
        },
        rejected: {
          label: 'Rejected',
          description: 'Customer declined this option. Keep it for the record or revise scope.',
          className: 'bg-red-500/15 text-red-300',
          icon: RotateCcw,
        },
      }[status];
  const StatusIcon = statusCard.icon;

  const handleSend = () => {
    setStatus('sent');
    toast.success('Quote finalized and texted to customer (simulated)');
  };

  const handleResend = () => {
    toast.success('Quote resent to customer (simulated)');
  };

  const handleAccept = () => {
    const nextAcceptedAt = new Date().toISOString();
    setStatus('accepted');
    setAcceptedAt(nextAcceptedAt);
    toast.success('Quote marked as accepted');
  };

  const handleCompleteToggle = () => {
    const nextCompletedAt = isCompleted ? null : new Date().toISOString();
    setCompletedAt(nextCompletedAt);
    toast.success(isCompleted ? 'Quote marked as not complete' : 'Quote marked complete');
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-4 ${statusCard.className}`}>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-black/10 p-2">
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{statusCard.label}</p>
            <p className="mt-1 text-sm opacity-90">{statusCard.description}</p>
            {acceptedAt && status === 'accepted' && !isCompleted && (
              <p className="mt-1 text-xs opacity-80">
                Accepted on {new Date(acceptedAt).toLocaleDateString()}
              </p>
            )}
            {completedAt && (
              <p className="mt-1 text-xs opacity-80">
                Marked complete on {new Date(completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Quote</p>
            <p className="text-xl font-semibold">{quote.short_ref}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{formatCents(quote.total_cents)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm">{quote.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Customer</span>
        </div>
        <p className="mt-1 font-semibold">{displayName}</p>
        <p className="text-sm text-muted-foreground">{formatPhoneNumber(customer.phone_number)}</p>
        {quote.service_address && (
          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{quote.service_address}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Customer approval flow</p>
            <p className="font-medium">Reply YES {confirmationCode}</p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            SMS
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          If they approve on a phone call instead, use the operator action below to keep the record current.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm text-muted-foreground">Line Items</p>
        <div className="space-y-2">
          {quote.line_items.map((item, index) => (
            <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1">{item.description}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCents(item.amount_cents)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-semibold">Operator Actions</p>
          <Link
            href={buildDemoNewQuotePath({ customer: customer.id })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            New quote
          </Link>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full" size="lg" asChild>
            <Link href={buildDemoQuoteDocumentPath({ quote: quote.id })} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Customer Preview
            </Link>
          </Button>

          {status === 'draft' && (
            <Button type="button" className="w-full" size="lg" onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" />
              Send Quote
            </Button>
          )}

          {status === 'sent' && (
            <>
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleResend}>
                <Send className="mr-2 h-4 w-4" />
                Resend Quote
              </Button>
              <Button type="button" className="w-full" size="lg" onClick={handleAccept}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept for Customer
              </Button>
            </>
          )}

          {status === 'accepted' && (
            <>
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleCompleteToggle}>
                {isCompleted ? (
                  <RotateCcw className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {isCompleted ? 'Mark Incomplete' : 'Mark Job Complete'}
              </Button>
              <Button className="w-full" size="lg" asChild>
                <Link href={buildDemoNewInvoicePath({ customer: customer.id, quote: quote.id })}>
                  Create Invoice
                </Link>
              </Button>
            </>
          )}

          {isCompleted && status === 'accepted' && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Completion stays visible here until the invoice is sent and closed out.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
