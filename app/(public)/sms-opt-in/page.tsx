import type { Metadata } from 'next';
import { BrandHeader } from '@/components/shared/brand-header';
import { SmsOptInPanel } from '@/components/shared/sms-opt-in-panel';
import { getPublicContactConfig } from '@/lib/config/contact';
import { getBusinessProfile } from '@/lib/config/business-profile';

const businessProfile = getBusinessProfile();
const { siteUrl } = getPublicContactConfig();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `SMS Opt-In | ${businessProfile.companyName}`,
  description: `Official SMS consent and opt-in page for ${businessProfile.companyName}.`,
  alternates: {
    canonical: '/sms-opt-in',
  },
};

export default function SmsOptInPage() {
  const {
    smsPhoneE164,
    smsPhoneDisplay,
    callPhoneDisplay,
    callHref,
    termsUrl,
    privacyUrl,
  } = getPublicContactConfig();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <BrandHeader href="/" className="mb-6" />
          <h1 className="text-3xl font-bold">SMS Service Opt-In</h1>
          <p className="mt-2 text-muted-foreground">
            This page is the official website call-to-action for {businessProfile.companyName} SMS
            consent.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-border bg-background p-6 md:p-8">
          <h2 className="text-xl font-semibold">How to Opt In</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
            <li>Review the disclosure and check the consent box.</li>
            <li>Tap the opt-in button to open your text app with START prefilled.</li>
            <li>Send that message to begin service-related SMS communication.</li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            Program name: {businessProfile.sms.programName}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Message frequency varies. Message and data rates may apply. Reply STOP to opt out and
            HELP for help. Consent is not a condition of purchase.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            You may also send your initial service inquiry after completing this opt-in step.
          </p>
        </section>

        <SmsOptInPanel
          smsPhoneE164={smsPhoneE164}
          smsPhoneDisplay={smsPhoneDisplay}
          termsUrl={termsUrl}
          privacyUrl={privacyUrl}
        />

        <p className="mt-6 text-sm text-muted-foreground">
          Prefer to call first?{' '}
          <a href={callHref} className="underline hover:text-foreground">
            Call {callPhoneDisplay}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
