import { formatPhoneNumber } from '@/lib/utils/format-phone';

interface CtaButtonProps {
  phoneNumber: string; // E.164 format: +15551234567
}

/**
 * CtaButton Component
 *
 * Primary call-to-action button that opens the SMS app with
 * the configured business number pre-filled. Uses sms: protocol link.
 *
 * @param phoneNumber - Phone number in E.164 format (e.g., +15551234567)
 */
export function CtaButton({ phoneNumber }: CtaButtonProps) {
  // Validate phoneNumber - return null if empty/invalid
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null;
  }

  const displayNumber = formatPhoneNumber(phoneNumber);

  return (
    <a
      href={`sms:${phoneNumber}`}
      className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      aria-label={`Text ${displayNumber}`}
    >
      Text {displayNumber}
    </a>
  );
}
