'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  MapPin,
  Pencil,
  Receipt,
  RotateCcw,
  Save,
  Send,
  Undo2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DemoCustomer, DemoInvoice, DemoQuote } from '@/lib/demo/demo-data';
import {
  centsToAmountInput,
  isAdjustmentNoteRequired,
  parseAmountToCents,
  sanitizeAmountInput,
} from '@/lib/demo/demo-form-utils';
import { buildDemoInvoiceDocumentPath, getDemoQuotePath } from '@/lib/demo-paths';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';

interface DemoInvoiceDetailProps {
  customer: DemoCustomer;
  invoice: DemoInvoice;
  relatedQuote?: DemoQuote | null;
}

type SimulatedInvoiceStatus = DemoInvoice['status'];

export function DemoInvoiceDetail({
  customer,
  invoice,
  relatedQuote = null,
}: DemoInvoiceDetailProps) {
  const initialJobDescription = invoice.job_description ?? relatedQuote?.description ?? '';
  const [status, setStatus] = useState<SimulatedInvoiceStatus>(invoice.status);
  const [sentAt, setSentAt] = useState<string | null>(invoice.sent_at);
  const [completedAt, setCompletedAt] = useState<string | null>(invoice.completed_at);
  const [paymentLink, setPaymentLink] = useState<string | null>(invoice.payment_link);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [amountCents, setAmountCents] = useState(invoice.amount_cents);
  const [adjustmentNote, setAdjustmentNote] = useState(invoice.adjustment_note ?? '');
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [amountInput, setAmountInput] = useState(centsToAmountInput(invoice.amount_cents));
  const [adjustmentNoteInput, setAdjustmentNoteInput] = useState(invoice.adjustment_note ?? '');
  const [jobDescriptionInput, setJobDescriptionInput] = useState(initialJobDescription);

  const displayName = customer.name || formatPhoneNumber(customer.phone_number);
  const serviceAddress = invoice.service_address || customer.address || null;
  const isCompleted = !!completedAt;
  const invoiceRef = formatInvoiceShortRef(invoice.id);
  const quoteAmountCents = relatedQuote?.total_cents ?? null;
  const parsedDraftAmountCents = parseAmountToCents(amountInput);
  const normalizedAdjustmentNote = adjustmentNote.trim();
  const normalizedAdjustmentNoteInput = adjustmentNoteInput.trim();
  const normalizedJobDescription = jobDescription.trim();
  const normalizedJobDescriptionInput = jobDescriptionInput.trim();
  const draftNoteRequired = isAdjustmentNoteRequired(parsedDraftAmountCents, quoteAmountCents);
  const savedNoteRequired = isAdjustmentNoteRequired(amountCents, quoteAmountCents);
  const draftAmountDelta =
    quoteAmountCents == null ? null : parsedDraftAmountCents - quoteAmountCents;
  const hasDraftChanges =
    parsedDraftAmountCents !== amountCents ||
    normalizedAdjustmentNoteInput !== normalizedAdjustmentNote ||
    normalizedJobDescriptionInput !== normalizedJobDescription;

  const statusCard = isCompleted
    ? {
        label: 'Completed',
        description:
          status === 'paid'
            ? 'Payment is in and the work order is closed out.'
            : 'The work is complete. You can still resend the payment link if needed.',
        className: 'bg-blue-500/15 text-blue-300',
        icon: CheckCircle2,
      }
    : {
        draft: {
          label: 'Draft',
          description: 'Review the final amount before you send the invoice and lock it.',
          className: 'bg-muted text-muted-foreground',
          icon: FileText,
        },
        sent: {
          label: 'Sent - Awaiting Payment',
          description: 'Customer has the payment link. Resend if they need a fresh text.',
          className: 'bg-amber-500/15 text-amber-300',
          icon: Clock3,
        },
        overdue: {
          label: 'Overdue',
          description: 'Payment is late. The reminder action is ready from this screen.',
          className: 'bg-red-500/15 text-red-300',
          icon: AlertTriangle,
        },
        paid: {
          label: 'Paid',
          description: 'Payment landed. Mark the job complete when the paperwork is done.',
          className: 'bg-green-500/15 text-green-300',
          icon: CheckCircle2,
        },
      }[status];
  const StatusIcon = statusCard.icon;

  const handleSendInvoice = () => {
    if (hasDraftChanges) {
      toast.error('Save draft changes before sending the invoice');
      return;
    }
    if (amountCents <= 0) {
      toast.error('Enter a valid amount greater than $0.00 before sending');
      return;
    }
    if (!normalizedJobDescription) {
      toast.error('Add a job description before sending');
      return;
    }
    if (savedNoteRequired && !normalizedAdjustmentNote) {
      toast.error('Adjustment note is required when amount differs from quote');
      return;
    }
    setShowSendConfirm(true);
  };

  const handleConfirmSend = () => {
    const now = new Date().toISOString();
    setShowSendConfirm(false);
    setStatus('sent');
    setSentAt(now);
    setPaymentLink((current) => current || 'https://payments.example.com/demo/invoice-live');
    toast.success('Invoice sent to customer (simulated)');
  };

  const handleResend = () => {
    toast.success('Fresh invoice link texted to customer (simulated)');
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;

    try {
      await navigator.clipboard.writeText(paymentLink);
      toast.success('Payment link copied');
    } catch {
      toast.error('Copy failed - please copy manually');
    }
  };

  const handleCompleteToggle = () => {
    const nextCompletedAt = isCompleted ? null : new Date().toISOString();
    setCompletedAt(nextCompletedAt);
    toast.success(isCompleted ? 'Invoice marked as not complete' : 'Invoice marked complete');
  };

  const handleSaveDraftEdits = () => {
    if (!hasDraftChanges) return;
    if (parsedDraftAmountCents <= 0) {
      toast.error('Enter a valid amount greater than $0.00');
      return;
    }
    if (normalizedAdjustmentNoteInput.length > 1000) {
      toast.error('Adjustment note must be 1000 characters or less');
      return;
    }
    if (normalizedJobDescriptionInput.length > 2000) {
      toast.error('Job description must be 2000 characters or less');
      return;
    }
    if (draftNoteRequired && !normalizedAdjustmentNoteInput) {
      toast.error('Adjustment note is required when amount differs from quote');
      return;
    }

    setAmountCents(parsedDraftAmountCents);
    setAdjustmentNote(normalizedAdjustmentNoteInput);
    setJobDescription(normalizedJobDescriptionInput);
    setAmountInput(centsToAmountInput(parsedDraftAmountCents));
    setAdjustmentNoteInput(normalizedAdjustmentNoteInput);
    setJobDescriptionInput(normalizedJobDescriptionInput);
    setShowSendConfirm(false);
    toast.success('Draft invoice updated (simulated)');
  };

  const handleResetDraftEdits = () => {
    setAmountInput(centsToAmountInput(amountCents));
    setAdjustmentNoteInput(adjustmentNote);
    setJobDescriptionInput(jobDescription);
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
            {sentAt && (status === 'sent' || status === 'overdue') && !isCompleted && (
              <p className="mt-1 text-xs opacity-80">
                Sent on {new Date(sentAt).toLocaleDateString()}
              </p>
            )}
            {invoice.paid_at && status === 'paid' && (
              <p className="mt-1 text-xs opacity-80">
                Paid on {new Date(invoice.paid_at).toLocaleDateString()}
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
            <p className="text-sm text-muted-foreground">Invoice</p>
            <p className="text-xl font-semibold">{invoiceRef}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-2xl font-bold">{formatCents(amountCents)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Customer</span>
        </div>
        <p className="mt-1 font-semibold">{displayName}</p>
        <p className="text-sm text-muted-foreground">{formatPhoneNumber(customer.phone_number)}</p>
        {serviceAddress && (
          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serviceAddress}</span>
          </div>
        )}
      </div>

      {status === 'draft' ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Final Invoice Amount</p>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setAmountInput(sanitizeAmountInput(e.target.value))}
              placeholder="0.00"
              className="h-11 w-full rounded-lg border bg-background py-2 pl-7 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {quoteAmountCents != null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Original quote total: {formatCents(quoteAmountCents)}
              {draftAmountDelta !== null && parsedDraftAmountCents > 0 && draftAmountDelta !== 0 && (
                <>
                  {' · '}
                  <span className={draftAmountDelta > 0 ? 'text-amber-500' : 'text-green-500'}>
                    {draftAmountDelta > 0 ? '+' : '-'}
                    {formatCents(Math.abs(draftAmountDelta))} adjustment
                  </span>
                </>
              )}
            </p>
          )}

          <p className="mt-1 text-xs text-muted-foreground">
            Draft edits are simulated on this screen. Save before sending to lock the final amount.
          </p>

          <div className="mt-3">
            <label htmlFor="demo-invoice-adjustment-note" className="mb-1 block text-sm font-medium">
              Adjustment Note {draftNoteRequired && <span className="text-destructive">*</span>}
            </label>
            <textarea
              id="demo-invoice-adjustment-note"
              value={adjustmentNoteInput}
              onChange={(e) => setAdjustmentNoteInput(e.target.value)}
              placeholder="Explain why the final amount changed"
              className="min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="mt-3">
            <label htmlFor="demo-invoice-job-description" className="mb-1 block text-sm font-medium">
              Job Description
            </label>
            <textarea
              id="demo-invoice-job-description"
              value={jobDescriptionInput}
              onChange={(e) => setJobDescriptionInput(e.target.value)}
              placeholder="Describe work completed"
              className="min-h-[90px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={handleResetDraftEdits}
              disabled={!hasDraftChanges}
            >
              <Undo2 className="h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              className="h-11 w-full"
              onClick={handleSaveDraftEdits}
              disabled={!hasDraftChanges}
            >
              <Save className="h-4 w-4" />
              Save Draft Changes
            </Button>
          </div>
        </div>
      ) : (
        (normalizedJobDescription || normalizedAdjustmentNote) && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Job Description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{normalizedJobDescription}</p>
          {normalizedAdjustmentNote && (
            <>
              <p className="mt-3 text-sm text-muted-foreground">Adjustment Note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{normalizedAdjustmentNote}</p>
            </>
          )}
        </div>
        )
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm text-muted-foreground">Line Items</p>
        <div className="space-y-2">
          {invoice.line_items.map((item, index) => (
            <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1">{item.description}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCents(item.amount_cents)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {relatedQuote && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span>Related Quote</span>
          </div>
          <p className="mt-1 font-semibold">{relatedQuote.short_ref}</p>
          <p className="mt-1 text-sm text-muted-foreground">{relatedQuote.description}</p>
          <Link
            href={getDemoQuotePath(relatedQuote.id)}
            className="mt-3 inline-flex text-sm text-accent hover:underline"
          >
            Back to quote
          </Link>
        </div>
      )}

      {paymentLink && status !== 'draft' && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Payment Link</p>
          <p className="mt-1 break-all text-sm">{paymentLink}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 font-semibold">Operator Actions</p>

        {showSendConfirm ? (
          <div className="space-y-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-300">Send this invoice?</p>
            <p className="text-sm text-muted-foreground">
              This locks the amount, creates the payment link, and sends the customer an SMS.
            </p>
            <p className="text-sm font-medium">Amount to send: {formatCents(amountCents)}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setShowSendConfirm(false)}>
                Cancel
              </Button>
              <Button type="button" size="lg" className="w-full" onClick={handleConfirmSend}>
                Yes, Send
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="outline" className="w-full" size="lg" asChild>
              <Link href={buildDemoInvoiceDocumentPath({ invoice: invoice.id })} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Customer Preview
              </Link>
            </Button>

            {status === 'draft' && (
              <Button type="button" className="w-full" size="lg" onClick={handleSendInvoice}>
                <Send className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            )}

            {(status === 'sent' || status === 'overdue') && (
              <>
                <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleResend}>
                  <Send className="mr-2 h-4 w-4" />
                  Resend Invoice
                </Button>
                <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleCompleteToggle}>
                  {isCompleted ? (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {isCompleted ? 'Mark Incomplete' : 'Mark Job Complete'}
                </Button>
              </>
            )}

            {status === 'paid' && (
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleCompleteToggle}>
                {isCompleted ? (
                  <RotateCcw className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {isCompleted ? 'Mark Incomplete' : 'Mark Job Complete'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
