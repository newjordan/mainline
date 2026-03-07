'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { acceptQuoteWithAudit } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/button';
import { getBusinessProfile } from '@/lib/config/business-profile';

interface AcceptQuoteButtonProps {
  quoteId: string;
}

/**
 * Allows admin to mark a sent quote as accepted after verbal approval.
 */
export function AcceptQuoteButton({ quoteId }: AcceptQuoteButtonProps) {
  const adminActorId = getBusinessProfile().operations.adminActorId;
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (isAccepting) return;

    const confirmed = window.confirm(
      'Mark this quote as accepted by customer verbal approval?'
    );
    if (!confirmed) return;

    setIsAccepting(true);

    try {
      const result = await acceptQuoteWithAudit(quoteId, 'admin', adminActorId, {
        accepted_via: 'verbal',
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to accept quote');
        return;
      }

      toast.success('Quote marked as accepted');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleAccept}
      disabled={isAccepting}
      className="w-full"
      size="lg"
      variant="default"
    >
      {isAccepting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      Accept for Customer
    </Button>
  );
}
