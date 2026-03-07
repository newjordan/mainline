'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { markQuoteCompleted, markQuoteIncomplete } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/button';

interface CompleteQuoteButtonProps {
  quoteId: string;
  isCompleted: boolean;
}

export function CompleteQuoteButton({
  quoteId,
  isCompleted,
}: CompleteQuoteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = isCompleted
        ? await markQuoteIncomplete(quoteId)
        : await markQuoteCompleted(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Failed to update completion state');
        return;
      }

      toast.success(
        isCompleted ? 'Quote marked as not complete' : 'Quote marked complete'
      );
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
      ) : isCompleted ? (
        <RotateCcw className="mr-2 h-4 w-4" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      {isCompleted ? 'Mark Incomplete' : 'Mark Job Complete'}
    </Button>
  );
}
