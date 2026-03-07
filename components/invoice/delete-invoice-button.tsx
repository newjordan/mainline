'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteInvoice } from '@/lib/actions/invoices';
import { Button } from '@/components/ui/button';

interface DeleteInvoiceButtonProps {
  invoiceId: string;
}

/**
 * Destructive action to remove a draft invoice when cleanup is needed.
 */
export function DeleteInvoiceButton({ invoiceId }: DeleteInvoiceButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmed = window.confirm(
      'Delete this invoice permanently? This cannot be undone.'
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteInvoice(invoiceId);

      if (!result.success) {
        toast.error(result.error || 'Failed to delete invoice');
        return;
      }

      toast.success('Invoice deleted');
      router.push('/invoices');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="lg"
      className="w-full"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      Delete Invoice
    </Button>
  );
}
