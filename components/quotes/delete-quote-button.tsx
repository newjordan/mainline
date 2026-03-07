'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteQuote } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/button';

interface DeleteQuoteButtonProps {
  quoteId: string;
}

/**
 * Destructive action to remove a quote when cleanup is needed.
 */
export function DeleteQuoteButton({ quoteId }: DeleteQuoteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmed = window.confirm(
      'Delete this quote permanently? This cannot be undone.'
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteQuote(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Failed to delete quote');
        return;
      }

      toast.success('Quote deleted');
      router.push('/quotes');
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
      Delete Quote
    </Button>
  );
}
