import { getBusinessProfile } from '@/lib/config/business-profile';

interface SmsOptInPanelProps {
  smsPhoneE164: string;
  smsPhoneDisplay: string;
  termsUrl: string;
  privacyUrl: string;
}

/**
 * Static, review-friendly SMS consent panel.
 *
 * Uses native HTML `required` checkbox validation so consent gating is visible
 * and does not depend on JavaScript state for carrier reviewers.
 */
export function SmsOptInPanel({
  smsPhoneE164,
  smsPhoneDisplay,
  termsUrl,
  privacyUrl,
}: SmsOptInPanelProps) {
  const businessProfile = getBusinessProfile();
  const smsHref = `sms:${smsPhoneE164}?body=START`;

  return (
    <section className="rounded-2xl border border-border bg-muted/50 p-6 md:p-8">
      <h2 className="text-xl font-semibold">Consent and Opt-In</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Check consent, then submit to open your text app with START prefilled.
      </p>

      <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
        <li>Service updates and responses to your inquiry</li>
        <li>Quotes, appointment reminders, and scheduling messages</li>
        <li>Invoices and payment notifications</li>
      </ul>

      <form action={smsHref} className="mt-6 rounded-xl border border-border bg-background p-4">
        <label htmlFor="sms-consent" className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            id="sms-consent"
            name="sms-consent"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          <span>
            I agree to receive SMS messages from {businessProfile.companyName} related to my
            requested service. Message frequency varies. Message and data rates may apply. Reply
            STOP to opt out and HELP for help. Consent is not a condition of purchase.
          </span>
        </label>

        <p className="mt-3 text-xs text-muted-foreground">
          Terms:{' '}
          <a href={termsUrl} className="underline hover:text-foreground">
            {termsUrl}
          </a>
          {' | '}
          Privacy:{' '}
          <a href={privacyUrl} className="underline hover:text-foreground">
            {privacyUrl}
          </a>
        </p>

        <button
          type="submit"
          className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 md:w-auto"
        >
          Text START to {smsPhoneDisplay}
        </button>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        If your device does not open SMS from the button, manually text <strong>START</strong> to{' '}
        <strong>{smsPhoneDisplay}</strong>.
      </p>
    </section>
  );
}
