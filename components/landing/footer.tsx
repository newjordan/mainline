import Link from 'next/link';
import { getBusinessProfile } from '@/lib/config/business-profile';

export interface FooterProps {
  serviceArea?: string;
  companyName?: string;
  serviceMessage?: string;
  showSmsOptInLink?: boolean;
}

/**
 * Footer Component
 *
 * Displays service area, legal links, and copyright notice.
 */
export function Footer({
  serviceArea = getBusinessProfile().serviceArea.label,
  companyName = getBusinessProfile().companyName,
  serviceMessage,
  showSmsOptInLink = true,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const links = [
    showSmsOptInLink ? { href: '/sms-opt-in', label: 'SMS Opt-In' } : null,
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <footer className="px-4 py-8 text-center md:py-12">
      <p className="mb-2 text-sm text-muted-foreground">
        {serviceMessage ?? `Serving ${serviceArea}`}
      </p>
      <div className="mb-3 flex justify-center gap-4 text-xs text-muted-foreground/80">
        {links.map((link, index) => (
          <div key={link.href} className="contents">
            {index > 0 ? <span className="text-muted-foreground/40">|</span> : null}
            <Link href={link.href} className="hover:text-foreground hover:underline">
              {link.label}
            </Link>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60">
        &copy; {currentYear} {companyName}
      </p>
    </footer>
  );
}
