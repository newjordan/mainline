'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { sendGoogleReviewRequest } from '@/lib/actions/messages';
import { Button } from '@/components/ui/button';

interface RequestReviewButtonProps {
  customerId: string;
}

/**
 * Sends a Google review request SMS to the customer.
 */
export function RequestReviewButton({ customerId }: RequestReviewButtonProps) {
  const [isSending, setIsSending] = useState(false);

  async function handleSendReviewRequest() {
    if (isSending) return;
    setIsSending(true);

    try {
      const result = await sendGoogleReviewRequest(customerId);
      if (!result.success) {
        toast.error(result.error || 'Failed to send review request');
        return;
      }

      toast.success('Google review request sent');
    } catch {
      toast.error('Failed to send review request');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full sm:w-auto"
      onClick={handleSendReviewRequest}
      disabled={isSending}
    >
      {isSending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Star className="mr-2 h-4 w-4" />
      )}
      Request Review
    </Button>
  );
}
