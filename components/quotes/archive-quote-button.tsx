'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { archiveQuote, unarchiveQuote } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/button';

interface ArchiveQuoteButtonProps {
  quoteId: string;
  isArchived: boolean;
}

export function ArchiveQuoteButton({ quoteId, isArchived }: ArchiveQuoteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = isArchived
        ? await unarchiveQuote(quoteId)
        : await archiveQuote(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Failed to update archive state');
        return;
      }

      toast.success(isArchived ? 'Quote restored to active list' : 'Quote archived');
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
      {isArchived ? 'Unarchive Quote' : 'Archive Quote'}
    </Button>
  );
}
