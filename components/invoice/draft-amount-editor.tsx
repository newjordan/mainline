'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateInvoice } from '@/lib/actions/invoices';
import { formatCents } from '@/lib/utils/format-currency';
import { Button } from '@/components/ui/button';

interface DraftAmountEditorProps {
  invoiceId: string;
  currentAmountCents: number;
  currentAdjustmentNote?: string | null;
  currentJobDescription?: string | null;
  quoteAmountCents?: number | null;
}

function formatCentsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseAmountToCents(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

function sanitizeAmountInput(value: string): string {
  let sanitized = '';
  let hasDot = false;
  let decimalCount = 0;

  for (const char of value) {
    if (char >= '0' && char <= '9') {
      if (hasDot) {
        if (decimalCount >= 2) continue;
        decimalCount += 1;
      }
      sanitized += char;
    } else if (char === '.' && !hasDot) {
      hasDot = true;
      sanitized += char;
    }
  }

  return sanitized;
}

export function DraftAmountEditor({
  invoiceId,
  currentAmountCents,
  currentAdjustmentNote,
  currentJobDescription,
  quoteAmountCents,
}: DraftAmountEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [amountInput, setAmountInput] = useState(
    formatCentsToInput(currentAmountCents)
  );
  const [noteInput, setNoteInput] = useState(currentAdjustmentNote ?? '');
  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    currentJobDescription ?? ''
  );

  const parsedAmountCents = parseAmountToCents(amountInput);
  const normalizedCurrentNote = (currentAdjustmentNote ?? '').trim();
  const normalizedNoteInput = noteInput.trim();
  const normalizedCurrentJobDescription = (currentJobDescription ?? '').trim();
  const normalizedJobDescriptionInput = jobDescriptionInput.trim();
  const hasAmountChange =
    parsedAmountCents > 0 && parsedAmountCents !== currentAmountCents;
  const hasNoteChange = normalizedNoteInput !== normalizedCurrentNote;
  const hasJobDescriptionChange =
    normalizedJobDescriptionInput !== normalizedCurrentJobDescription;
  const hasChanges = hasAmountChange || hasNoteChange || hasJobDescriptionChange;
  const deltaFromQuote = useMemo(() => {
    if (quoteAmountCents == null) return null;
    return parsedAmountCents - quoteAmountCents;
  }, [parsedAmountCents, quoteAmountCents]);
  const noteRequired =
    quoteAmountCents != null &&
    parsedAmountCents > 0 &&
    parsedAmountCents !== quoteAmountCents;

  async function handleSave() {
    if (!hasChanges || isSaving) return;
    if (parsedAmountCents <= 0) {
      toast.error('Enter a valid amount greater than $0.00');
      return;
    }
    if (noteInput.trim().length > 1000) {
      toast.error('Adjustment note must be 1000 characters or less');
      return;
    }
    if (normalizedJobDescriptionInput.length > 2000) {
      toast.error('Job description must be 2000 characters or less');
      return;
    }
    if (noteRequired && !normalizedNoteInput) {
      toast.error('Adjustment note is required when amount differs from quote');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateInvoice(invoiceId, {
        amount_cents: parsedAmountCents,
        adjustment_note: normalizedNoteInput || null,
        job_description: normalizedJobDescriptionInput || null,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update invoice amount');
        return;
      }

      toast.success('Final invoice amount updated');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update invoice amount';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setAmountInput(formatCentsToInput(currentAmountCents));
    setNoteInput(currentAdjustmentNote ?? '');
    setJobDescriptionInput(currentJobDescription ?? '');
  }

  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Pencil className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Final Invoice Amount</h2>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={amountInput}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setAmountInput(sanitizeAmountInput(e.target.value))}
          placeholder="0.00"
          className="h-11 w-full rounded-lg border bg-background py-2 pl-7 pr-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSaving}
        />
      </div>

      {quoteAmountCents != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Original quote total: {formatCents(quoteAmountCents)}
          {deltaFromQuote !== null && parsedAmountCents > 0 && deltaFromQuote !== 0 && (
            <>
              {' · '}
              <span className={deltaFromQuote > 0 ? 'text-amber-500' : 'text-green-500'}>
                {deltaFromQuote > 0 ? '+' : '-'}
                {formatCents(Math.abs(deltaFromQuote))} adjustment
              </span>
            </>
          )}
        </p>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        Final amount can be changed while draft. It locks after sending.
      </p>

      <div className="mt-3">
        <label htmlFor="invoice-adjustment-note" className="mb-1 block text-sm font-medium">
          Adjustment Note {noteRequired && <span className="text-destructive">*</span>}
        </label>
        <textarea
          id="invoice-adjustment-note"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Explain why the final amount changed"
          className="min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSaving}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          This note is part of the invoice.
        </p>
      </div>

      <div className="mt-3">
        <label htmlFor="invoice-job-description" className="mb-1 block text-sm font-medium">
          Job Description
        </label>
        <textarea
          id="invoice-job-description"
          value={jobDescriptionInput}
          onChange={(e) => setJobDescriptionInput(e.target.value)}
          placeholder="Describe work completed"
          className="min-h-[90px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSaving}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSaving || !hasChanges}
          className="h-11 w-full"
        >
          <Undo2 className="h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="h-11 w-full"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Final Amount
        </Button>
      </div>
    </div>
  );
}
