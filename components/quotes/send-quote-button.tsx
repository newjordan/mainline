'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { sendQuote } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/button';

interface SendQuoteButtonProps {
  quoteId: string;
  isResend?: boolean;
}

/**
 * SendQuoteButton Component
 *
 * Client component that handles sending/resending a quote via SMS.
 */
export function SendQuoteButton({ quoteId, isResend = false }: SendQuoteButtonProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);

    try {
      const result = await sendQuote(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Failed to send quote');
        return;
      }

      toast.success(isResend ? 'Quote resent!' : 'Quote sent!');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      onClick={handleSend}
      disabled={isSending}
      variant={isResend ? 'outline' : 'default'}
      className="w-full"
      size="lg"
    >
      {isSending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Send className="mr-2 h-4 w-4" />
      )}
      {isResend ? 'Resend Quote' : 'Send Quote'}
    </Button>
  );
}
