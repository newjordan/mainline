'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { archiveInvoice, unarchiveInvoice } from '@/lib/actions/invoices';
import { Button } from '@/components/ui/button';

interface ArchiveInvoiceButtonProps {
  invoiceId: string;
  isArchived: boolean;
}

export function ArchiveInvoiceButton({
  invoiceId,
  isArchived,
}: ArchiveInvoiceButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = isArchived
        ? await unarchiveInvoice(invoiceId)
        : await archiveInvoice(invoiceId);

      if (!result.success) {
        toast.error(result.error || 'Failed to update archive state');
        return;
      }

      toast.success(isArchived ? 'Invoice restored to active list' : 'Invoice archived');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={handleToggle}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isArchived ? (
        <Undo2 className="mr-2 h-4 w-4" />
      ) : (
        <Archive className="mr-2 h-4 w-4" />
      )}
      {isArchived ? 'Unarchive Invoice' : 'Archive Invoice'}
    </Button>
  );
}
