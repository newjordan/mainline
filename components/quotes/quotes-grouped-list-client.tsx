'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, CheckCircle2, ChevronDown, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  bulkUpdateQuotesLifecycle,
  type QuoteBulkLifecycleOperation,
} from '@/lib/actions/quotes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export interface QuoteListCardItem {
  id: string;
  short_ref: string;
  description: string;
  total_cents: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  archived_at: string | null;
  completed_at: string | null;
}

export interface QuoteCustomerGroup {
  customerId: string;
  label: string;
  subLabel: string | null;
  quotes: QuoteListCardItem[];
  pendingCount: number;
  acceptedCount: number;
}

interface QuotesGroupedListClientProps {
  groups: QuoteCustomerGroup[];
  selectedCustomerId?: string;
}

function getQuoteDisplayStatus(quote: QuoteListCardItem): string {
  if (quote.archived_at) return 'archived';
  if (quote.completed_at) return 'completed';
  return quote.status;
}

function getQuoteStatusColor(quote: QuoteListCardItem): string {
  if (quote.archived_at) return 'text-slate-400';
  if (quote.completed_at) return 'text-blue-500';
  if (quote.status === 'accepted') return 'text-green-500';
  if (quote.status === 'sent') return 'text-amber-500';
  if (quote.status === 'rejected') return 'text-red-500';
  return 'text-muted-foreground';
}

function getQuoteStatusBg(quote: QuoteListCardItem): string {
  if (quote.archived_at) return 'bg-slate-100 dark:bg-slate-800';
  if (quote.completed_at) return 'bg-blue-50 dark:bg-blue-950';
  if (quote.status === 'accepted') return 'bg-green-50 dark:bg-green-950';
  if (quote.status === 'sent') return 'bg-amber-50 dark:bg-amber-950';
  if (quote.status === 'rejected') return 'bg-red-50 dark:bg-red-950';
  return 'bg-muted';
}

function quoteBulkConfirmMessage(
  operation: QuoteBulkLifecycleOperation,
  count: number
): string {
  if (operation === 'archive') {
    return `Archive ${count} selected quote${count === 1 ? '' : 's'}? Quotes pending customer response stay protected.`;
  }

  if (operation === 'unarchive') {
    return `Unarchive ${count} selected quote${count === 1 ? '' : 's'}?`;
  }

  return `Mark ${count} selected quote${count === 1 ? '' : 's'} complete? Only accepted quotes can be completed.`;
}

export function QuotesGroupedListClient({
  groups,
  selectedCustomerId,
}: QuotesGroupedListClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<string[]>(() => {
    if (selectedCustomerId) return [selectedCustomerId];
    const firstCustomerId = groups[0]?.customerId;
    return firstCustomerId ? [firstCustomerId] : [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const expandedSet = useMemo(() => new Set(expandedCustomerIds), [expandedCustomerIds]);

  useEffect(() => {
    setExpandedCustomerIds((previous) => {
      const validIds = new Set(groups.map((group) => group.customerId));
      let next = previous.filter((customerId) => validIds.has(customerId));

      if (selectedCustomerId && validIds.has(selectedCustomerId)) {
        if (!next.includes(selectedCustomerId)) {
          next = [selectedCustomerId, ...next];
        }
        return next;
      }

      if (next.length === 0 && groups[0]) {
        return [groups[0].customerId];
      }

      return next;
    });
  }, [groups, selectedCustomerId]);

  const allVisibleIds = useMemo(
    () => groups.flatMap((group) => group.quotes.map((quote) => quote.id)),
    [groups]
  );

  const allVisibleChecked =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedSet.has(id));
  const partiallyChecked = !allVisibleChecked && selectedIds.length > 0;

  const setCheckedForIds = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return Array.from(next);
    });
  };

  const toggleGroup = (customerId: string) => {
    setExpandedCustomerIds((previous) =>
      previous.includes(customerId)
        ? previous.filter((currentId) => currentId !== customerId)
        : [...previous, customerId]
    );
  };

  const handleBulkOperation = async (operation: QuoteBulkLifecycleOperation) => {
    if (selectedIds.length === 0 || isSubmitting) return;

    const confirmation = window.confirm(
      quoteBulkConfirmMessage(operation, selectedIds.length)
    );
    if (!confirmation) return;

    setIsSubmitting(true);

    try {
      const result = await bulkUpdateQuotesLifecycle(selectedIds, operation);

      if (!result.success) {
        toast.error(result.error || 'Bulk operation failed');
        return;
      }

      const { updated, failed, attempted } = result.data;

      if (updated > 0) {
        toast.success(
          `${updated} of ${attempted} quote${attempted === 1 ? '' : 's'} updated`
        );
      }

      if (failed.length > 0) {
        toast.error(
          `${failed.length} quote${failed.length === 1 ? '' : 's'} skipped. ${failed[0].error}`
        );
      }

      setSelectedIds([]);
      router.refresh();
    } catch {
      toast.error('Bulk operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk select bar */}
      <div className="rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={allVisibleChecked ? true : partiallyChecked ? 'indeterminate' : false}
              onCheckedChange={(checked) =>
                setCheckedForIds(allVisibleIds, checked === true)
              }
              disabled={allVisibleIds.length === 0 || isSubmitting}
              aria-label="Select all visible quotes"
              className="h-5 w-5"
            />
            Select all
          </label>

          {selectedIds.length > 0 && (
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => handleBulkOperation('archive')}
              disabled={isSubmitting}
              className="h-12 text-sm"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Archive className="mr-2 h-5 w-5" />
              )}
              Archive
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => handleBulkOperation('unarchive')}
              disabled={isSubmitting}
              className="h-12 text-sm"
            >
              <Undo2 className="mr-2 h-5 w-5" />
              Unarchive
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => handleBulkOperation('mark-complete')}
              disabled={isSubmitting}
              className="h-12 text-sm"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Complete
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              disabled={isSubmitting}
              className="h-12 text-sm"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Customer groups */}
      {groups.map((group) => {
        const groupIds = group.quotes.map((quote) => quote.id);
        let selectedInGroup = 0;
        for (const id of groupIds) {
          if (selectedSet.has(id)) selectedInGroup += 1;
        }
        const groupChecked =
          groupIds.length > 0 && selectedInGroup === groupIds.length;
        const groupPartiallyChecked = selectedInGroup > 0 && !groupChecked;
        const isExpanded = expandedSet.has(group.customerId);

        return (
          <section
            key={group.customerId}
            className="overflow-hidden rounded-lg border bg-card"
          >
            {/* Customer header — big tap target */}
            <button
              type="button"
              onClick={() => toggleGroup(group.customerId)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-muted/50"
              aria-expanded={isExpanded}
              aria-controls={`quotes-group-${group.customerId}`}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center"
              >
                <Checkbox
                  checked={
                    groupChecked ? true : groupPartiallyChecked ? 'indeterminate' : false
                  }
                  onCheckedChange={(checked) =>
                    setCheckedForIds(groupIds, checked === true)
                  }
                  disabled={groupIds.length === 0 || isSubmitting}
                  aria-label={`Select all quotes for ${group.label}`}
                  className="h-5 w-5"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{group.label}</p>
                {group.subLabel && (
                  <p className="truncate text-sm text-muted-foreground">{group.subLabel}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="flex gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-1 tabular-nums">
                    {group.quotes.length}
                  </span>
                  {group.pendingCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 tabular-nums text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {group.pendingCount}
                    </span>
                  )}
                  {group.acceptedCount > 0 && (
                    <span className="rounded-full bg-green-100 px-2 py-1 tabular-nums text-green-700 dark:bg-green-900 dark:text-green-300">
                      {group.acceptedCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Expanded quote rows — tabular layout */}
            {isExpanded && (
              <div
                id={`quotes-group-${group.customerId}`}
                className="border-t"
              >
                {group.quotes.map((quote, idx) => (
                  <div
                    key={quote.id}
                    className={`flex items-center gap-3 px-4 ${idx > 0 ? 'border-t border-border/50' : ''}`}
                  >
                    <div className="flex items-center py-3">
                      <Checkbox
                        checked={selectedSet.has(quote.id)}
                        onCheckedChange={(checked) =>
                          setCheckedForIds([quote.id], checked === true)
                        }
                        disabled={isSubmitting}
                        aria-label={`Select quote ${quote.short_ref}`}
                        className="h-5 w-5"
                      />
                    </div>

                    <Link
                      href={`/quotes/${quote.id}`}
                      className="flex min-h-[56px] min-w-0 flex-1 items-center py-3 active:bg-accent/30"
                    >
                      {/* Tabular row: ref | description | amount | status */}
                      <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-3">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {quote.short_ref}
                        </span>
                        <p className="truncate text-sm">
                          {quote.description}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold tabular-nums whitespace-nowrap">
                            ${(quote.total_cents / 100).toFixed(2)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getQuoteStatusBg(quote)} ${getQuoteStatusColor(quote)}`}
                          >
                            {getQuoteDisplayStatus(quote)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
