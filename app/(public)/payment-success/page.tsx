import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BrandHeader } from '@/components/shared/brand-header';
import { getPublicContactConfig } from '@/lib/config/contact';
import { getBusinessProfile } from '@/lib/config/business-profile';

const businessProfile = getBusinessProfile();

export const metadata: Metadata = {
  title: `Payment Successful | ${businessProfile.companyName}`,
  description: 'Thank you for your payment. Your invoice has been paid.',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Payment Success Page
 *
 * Public confirmation page shown after successful checkout.
 */
export default function PaymentSuccessPage() {
  const { smsHref, smsPhoneDisplay } = getPublicContactConfig();

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-md text-center md:max-w-lg">
        <div className="mb-6">
          <BrandHeader href="/" showSubtitle={false} />
        </div>

        <div className="mb-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-lg">
          <Image
            src={businessProfile.assets.paymentSuccessImageSrc}
            alt="Payment received confirmation"
            width={400}
            height={400}
            className="mx-auto rounded-xl"
            priority
          />
        </div>

        <div className="mb-6 rounded-2xl border border-border/70 bg-card p-6 shadow-lg">
          <h1 className="mb-3 text-2xl font-bold text-primary">Payment Received</h1>
          <p className="text-muted-foreground">
            Thank you for your business. We appreciate the opportunity to serve you.
          </p>
          <p className="mt-4 text-sm text-muted-foreground/80">A receipt has been sent to your email.</p>
        </div>

        <div className="mb-8 rounded-xl border border-border/60 bg-muted/55 p-5">
          <p className="text-sm text-muted-foreground">
            Questions about your service? Send us a text and we will help.
          </p>
          <a
            href={smsHref}
            className="mt-3 inline-block font-semibold text-primary hover:text-primary/80"
          >
            Text {smsPhoneDisplay}
          </a>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Home
        </Link>

        <p className="mt-8 text-xs text-muted-foreground/70">{businessProfile.marketing.tagline}</p>
      </div>
    </main>
  );
}
