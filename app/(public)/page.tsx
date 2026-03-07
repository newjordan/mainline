import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Footer } from '@/components/landing/footer';
import { TrustCarousel } from '@/components/landing/trust-carousel';
import { EquipmentExpertise } from '@/components/landing/equipment-expertise';
import { OwnerPhoto } from '@/components/shared/owner-photo';
import { BrandHeader } from '@/components/shared/brand-header';
import { WelcomePopup } from '@/components/landing/welcome-popup';
import { WelcomeTrigger } from '@/components/landing/welcome-trigger';
import { getPublicContactConfig } from '@/lib/config/contact';
import { getBusinessProfile } from '@/lib/config/business-profile';

const businessProfile = getBusinessProfile();
const contact = getPublicContactConfig();

const socialImageUrl = businessProfile.assets.logoStackedSrc;
const pageTitle = businessProfile.marketing.metaTitle;
const pageDescription = businessProfile.marketing.metaDescription;

export const metadata: Metadata = {
  metadataBase: new URL(contact.siteUrl),
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    type: 'website',
    locale: 'en_US',
    siteName: businessProfile.companyName,
    images: [
      {
        url: socialImageUrl,
        width: 1408,
        height: 1760,
        alt: `${businessProfile.companyName} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
    images: [socialImageUrl],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': contact.siteUrl,
  url: contact.siteUrl,
  name: businessProfile.companyName,
  description: pageDescription,
  telephone: contact.callPhoneE164,
  address: {
    '@type': 'PostalAddress',
    addressLocality: businessProfile.serviceArea.city,
    addressRegion: businessProfile.serviceArea.region,
    addressCountry: businessProfile.serviceArea.country,
  },
  areaServed: { '@type': 'City', name: businessProfile.serviceArea.city },
  priceRange: '$$',
  image: `${contact.siteUrl}${socialImageUrl}`,
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <WelcomePopup />
      <WelcomeTrigger />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ── */}
      <section className="px-4 pb-8 pt-12 md:pb-12 md:pt-20 lg:pb-16 lg:pt-28">
        <div className="mx-auto max-w-md text-center md:max-w-2xl lg:max-w-4xl">
          <h1 className="sr-only">
            {businessProfile.companyName} &mdash; {businessProfile.industryDescription}
          </h1>

          <div className="relative mx-auto mb-6 w-[100px] md:w-[140px] lg:w-[160px]">
            <Image
              src={businessProfile.assets.logoStackedSrc}
              alt={`${businessProfile.companyName} logo`}
              width={320}
              height={400}
              className="h-auto w-full"
              priority
            />
          </div>

          <OwnerPhoto />

          <p className="mb-2 text-xl font-semibold md:text-2xl lg:text-3xl">
            Hi, I&apos;m {businessProfile.ownerDisplayName}
          </p>

          <p className="mb-4 text-base font-medium text-accent md:text-lg">
            {businessProfile.marketing.tagline}
          </p>

          <p className="mx-auto mb-2 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            {businessProfile.marketing.heroSubtitle}
          </p>

          <BrandHeader className="mt-6" />
        </div>
      </section>

      {/* ── Trust carousel ── */}
      <section className="px-4 py-8 md:py-12">
        <div className="mx-auto max-w-md md:max-w-xl lg:max-w-2xl">
          <TrustCarousel />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-muted px-4 py-8 md:py-12 lg:py-16">
        <div className="mx-auto max-w-md text-center md:max-w-2xl">
          <p className="mb-6 text-lg font-medium md:text-xl">
            {businessProfile.marketing.callToActionTitle}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={contact.smsOptInUrl}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              Text to Opt In
            </Link>
            <a
              href={contact.callHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-secondary px-8 py-4 text-lg font-semibold text-secondary-foreground shadow-lg transition-colors hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              Call {contact.callPhoneDisplay}
            </a>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Start on our SMS opt-in page, then text your initial service inquiry or send START.
          </p>

          <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground/70">
            By texting {businessProfile.companyName}, you consent to receive SMS messages
            including service updates, quotes, appointment reminders, invoices, and payment
            notifications. Message frequency varies. Msg &amp; data rates may apply. Consent is
            not a condition of purchase. Reply STOP to unsubscribe, HELP for help.{' '}
            <Link href="/terms" className="underline hover:text-muted-foreground">
              Terms
            </Link>{' '}
            &amp;{' '}
            <Link href="/privacy" className="underline hover:text-muted-foreground">
              Privacy Policy
            </Link>
          </p>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-border/70 bg-background/85 p-5 text-left shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              For developers &amp; business owners
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground md:text-xl">
              Want to explore the app before setting it up?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Open the interactive demo with realistic sample data. No sign-up is required for the
              test drive.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo/login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Try Interactive Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Equipment ── */}
      <section className="bg-muted/50 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-md md:max-w-xl lg:max-w-2xl">
          <EquipmentExpertise />
        </div>
      </section>

      <Footer />
    </main>
  );
}
