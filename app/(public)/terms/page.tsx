import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandHeader } from '@/components/shared/brand-header';
import { getPublicContactConfig } from '@/lib/config/contact';
import { getBusinessProfile } from '@/lib/config/business-profile';

const businessProfile = getBusinessProfile();

export const metadata: Metadata = {
  title: `Terms of Service | ${businessProfile.companyName}`,
  description: `Terms of Service for ${businessProfile.companyName} service and SMS communications.`,
};

export default function TermsOfServicePage() {
  const lastUpdated = 'March 4, 2026';
  const { smsPhoneDisplay, callPhoneDisplay } = getPublicContactConfig();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <BrandHeader href="/" className="mb-6" />
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="mt-2 text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Agreement to Terms</h2>
            <p className="leading-relaxed text-muted-foreground">
              By using {businessProfile.companyName}&apos;s services, website, or SMS messaging
              system, you agree to these Terms of Service. If you do not agree, please do not use
              our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Services</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              {businessProfile.companyName} provides {businessProfile.industryDescription.toLowerCase()} services in{' '}
              {businessProfile.serviceArea.label}. Our services may include diagnostics, repairs,
              installation, and preventive maintenance.
            </p>

            <h3 className="mb-2 mt-6 text-lg font-medium">Quotes and Pricing</h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>All quotes are valid for 30 days from the date issued.</li>
              <li>Prices include parts and labor unless otherwise noted.</li>
              <li>Additional work discovered during service is quoted before proceeding.</li>
              <li>Payment is due upon completion of service unless otherwise stated.</li>
            </ul>

            <h3 className="mb-2 mt-6 text-lg font-medium">Warranty</h3>
            <p className="leading-relaxed text-muted-foreground">
              Work performed by {businessProfile.companyName} is warranted against defects in
              workmanship. Parts warranties are provided by manufacturers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">SMS Terms and Conditions</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              By texting {businessProfile.companyName} or opting in to our SMS service, you agree
              to the following:
            </p>

            <h3 className="mb-2 mt-6 text-lg font-medium">Consent to Receive Messages</h3>
            <p className="leading-relaxed text-muted-foreground">
              You may consent by using our website opt-in page at{' '}
              <Link href="/sms-opt-in" className="underline hover:text-foreground">
                /sms-opt-in
              </Link>{' '}
              and then texting START to our business number at {smsPhoneDisplay}. You may also text
              our business number directly to start a service conversation. Consent is not a
              condition of purchasing goods or services.
            </p>

            <h3 className="mb-2 mt-6 text-lg font-medium">Message Types</h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Responses to your service inquiries</li>
              <li>Service quotes and estimates</li>
              <li>Appointment confirmations and reminders</li>
              <li>Invoices and payment links</li>
              <li>Service completion notifications</li>
              <li>Payment reminders for outstanding invoices</li>
            </ul>

            <h3 className="mb-2 mt-6 text-lg font-medium">Message Frequency and Costs</h3>
            <p className="leading-relaxed text-muted-foreground">
              Message frequency varies based on your service needs and interactions. Message and
              data rates may apply. We do not charge separate SMS fees.
            </p>

            <h3 className="mb-2 mt-6 text-lg font-medium">Opt-Out and Help</h3>
            <p className="leading-relaxed text-muted-foreground">
              Reply <strong>STOP</strong> to opt out of SMS messages. Reply <strong>HELP</strong>{' '}
              for assistance, or call {callPhoneDisplay}.
            </p>

            <h3 className="mb-2 mt-6 text-lg font-medium">Carrier Disclaimer</h3>
            <p className="leading-relaxed text-muted-foreground">
              Carriers are not liable for delayed or undelivered messages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Limitation of Liability</h2>
            <p className="leading-relaxed text-muted-foreground">
              {businessProfile.companyName}&apos;s liability is limited to the cost of services
              provided. We are not liable for indirect, incidental, or consequential damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Service Area</h2>
            <p className="leading-relaxed text-muted-foreground">
              Service availability is based on location and scheduling. Current area:{' '}
              {businessProfile.serviceArea.label}.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Changes to Terms</h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update these Terms of Service from time to time. Continued use of our services
              after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Contact Information</h2>
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
