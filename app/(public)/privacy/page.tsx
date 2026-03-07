import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandHeader } from '@/components/shared/brand-header';
import { getPublicContactConfig } from '@/lib/config/contact';
import { getBusinessProfile } from '@/lib/config/business-profile';

const businessProfile = getBusinessProfile();

export const metadata: Metadata = {
  title: `Privacy Policy | ${businessProfile.companyName}`,
  description: `Privacy policy for ${businessProfile.companyName}.`,
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'March 4, 2026';
  const { smsPhoneDisplay, callPhoneDisplay } = getPublicContactConfig();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <BrandHeader href="/" className="mb-6" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Introduction</h2>
            <p className="leading-relaxed text-muted-foreground">
              {businessProfile.companyName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects
              your privacy. This policy explains how we collect, use, and protect information when
              you use our services or communicate with us by SMS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Information We Collect</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Contact Information:</strong> phone number, name, and service address
              </li>
              <li>
                <strong>Service Information:</strong> equipment details, service history, and job
                notes
              </li>
              <li>
                <strong>Communication Records:</strong> SMS messages exchanged with our business
              </li>
              <li>
                <strong>Payment Information:</strong> handled by a secure payment processor
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Provide and fulfill requested services</li>
              <li>Send service quotes, invoices, and scheduling updates</li>
              <li>Respond to questions and support requests</li>
              <li>Process payments for services rendered</li>
              <li>Maintain service history and improve operations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">SMS Text Messaging</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              You may opt in at{' '}
              <Link href="/sms-opt-in" className="underline hover:text-foreground">
                /sms-opt-in
              </Link>{' '}
              and text START, or by texting our business number directly.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <strong>Message frequency varies.</strong> Message and data rates may apply. Reply
              <strong> STOP</strong> to opt out and <strong>HELP</strong> for assistance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Information Sharing</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              We do not sell, trade, or rent your personal information. We only share data with
              service providers needed to operate the platform (for example, SMS, payment, and
              hosting providers) or when required by law.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              No mobile information will be shared with third parties/affiliates for marketing or
              promotional purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Data Security and Retention</h2>
            <p className="leading-relaxed text-muted-foreground">
              We use reasonable safeguards to protect your information and retain data only as long
              as needed for service delivery, legal requirements, and continuity of support.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Your Rights</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Opt out of SMS communications by replying STOP</li>
              <li>Request access to your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion where legally permitted</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Contact</h2>
            <ul className="mt-4 list-none space-y-2 text-muted-foreground">
              <li>
                <strong>Business:</strong> {businessProfile.companyName}
              </li>
              <li>
                <strong>Text:</strong> {smsPhoneDisplay}
              </li>
              <li>
                <strong>Call:</strong> {callPhoneDisplay}
              </li>
              <li>
                <strong>Service Area:</strong> {businessProfile.serviceArea.label}
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-accent hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
