'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, CheckCircle2, ChevronDown, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  bulkUpdateInvoicesLifecycle,
  type InvoiceBulkLifecycleOperation,
} from '@/lib/actions/invoices';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';

export interface InvoiceListCardItem {
  id: string;
  amount_cents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
  completed_at: string | null;
  archived_at: string | null;
}

export interface InvoiceCustomerGroup {
  customerId: string;
  label: string;
  subLabel: string | null;
  invoices: InvoiceListCardItem[];
  outstandingCount: number;
  paidCount: number;
}

interface InvoicesGroupedListClientProps {
  groups: InvoiceCustomerGroup[];
  selectedCustomerId?: string;
}

function getInvoiceDisplayStatus(invoice: InvoiceListCardItem): string {
  if (invoice.archived_at) return 'archived';
  if (invoice.completed_at) return 'completed';
  return invoice.status;
}

function getInvoiceStatusColor(invoice: InvoiceListCardItem): string {
  if (invoice.archived_at) return 'text-slate-400';
  if (invoice.completed_at) return 'text-blue-500';
  if (invoice.status === 'paid') return 'text-green-500';
  if (invoice.status === 'overdue') return 'text-red-500';
  if (invoice.status === 'sent') return 'text-amber-500';
  return 'text-muted-foreground';
}

function getInvoiceStatusBg(invoice: InvoiceListCardItem): string {
  if (invoice.archived_at) return 'bg-slate-100 dark:bg-slate-800';
  if (invoice.completed_at) return 'bg-blue-50 dark:bg-blue-950';
  if (invoice.status === 'paid') return 'bg-green-50 dark:bg-green-950';
  if (invoice.status === 'overdue') return 'bg-red-50 dark:bg-red-950';
  if (invoice.status === 'sent') return 'bg-amber-50 dark:bg-amber-950';
  return 'bg-muted';
}

function invoiceBulkConfirmMessage(
  operation: InvoiceBulkLifecycleOperation,
  count: number
): string {
  if (operation === 'archive') {
    return `Archive ${count} selected invoice${count === 1 ? '' : 's'}? Invoices with outstanding payment stay protected.`;
  }

  if (operation === 'unarchive') {
    return `Unarchive ${count} selected invoice${count === 1 ? '' : 's'}?`;
  }

  return `Mark ${count} selected invoice${count === 1 ? '' : 's'} complete? Draft invoices are skipped.`;
}

export function InvoicesGroupedListClient({
  groups,
  selectedCustomerId,
}: InvoicesGroupedListClientProps) {
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
    () => groups.flatMap((group) => group.invoices.map((invoice) => invoice.id)),
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

  const handleBulkOperation = async (operation: InvoiceBulkLifecycleOperation) => {
    if (selectedIds.length === 0 || isSubmitting) return;

    const confirmation = window.confirm(
      invoiceBulkConfirmMessage(operation, selectedIds.length)
    );
    if (!confirmation) return;

    setIsSubmitting(true);

    try {
      const result = await bulkUpdateInvoicesLifecycle(selectedIds, operation);

      if (!result.success) {
        toast.error(result.error || 'Bulk operation failed');
        return;
      }

      const { updated, failed, attempted } = result.data;

      if (updated > 0) {
        toast.success(
          `${updated} of ${attempted} invoice${attempted === 1 ? '' : 's'} updated`
        );
      }

      if (failed.length > 0) {
        toast.error(
          `${failed.length} invoice${failed.length === 1 ? '' : 's'} skipped. ${failed[0].error}`
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
              aria-label="Select all visible invoices"
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
        const groupIds = group.invoices.map((invoice) => invoice.id);
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
              aria-controls={`invoices-group-${group.customerId}`}
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
                  aria-label={`Select all invoices for ${group.label}`}
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
                    {group.invoices.length}
                  </span>
                  {group.outstandingCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 tabular-nums text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {group.outstandingCount}
                    </span>
                  )}
                  {group.paidCount > 0 && (
                    <span className="rounded-full bg-green-100 px-2 py-1 tabular-nums text-green-700 dark:bg-green-900 dark:text-green-300">
                      {group.paidCount}
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

            {/* Expanded invoice rows — tabular layout */}
            {isExpanded && (
              <div
                id={`invoices-group-${group.customerId}`}
                className="border-t"
              >
                {group.invoices.map((invoice, idx) => {
                  const shortRef = formatInvoiceShortRef(invoice.id);
                  return (
                  <div
                    key={invoice.id}
                    className={`flex items-center gap-3 px-4 ${idx > 0 ? 'border-t border-border/50' : ''}`}
                  >
                    <div className="flex items-center py-3">
                      <Checkbox
                        checked={selectedSet.has(invoice.id)}
                        onCheckedChange={(checked) =>
                          setCheckedForIds([invoice.id], checked === true)
                        }
                        disabled={isSubmitting}
                        aria-label={`Select invoice ${shortRef}`}
                        className="h-5 w-5"
                      />
                    </div>

                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="flex min-h-[56px] min-w-0 flex-1 items-center py-3 active:bg-accent/30"
                    >
                      {/* Tabular row: date | id | amount | status */}
                      <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </span>
                        <p className="truncate text-sm text-muted-foreground">
                          {shortRef}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold tabular-nums whitespace-nowrap">
                            ${(invoice.amount_cents / 100).toFixed(2)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getInvoiceStatusBg(invoice)} ${getInvoiceStatusColor(invoice)}`}
                          >
                            {getInvoiceDisplayStatus(invoice)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
