import Image from 'next/image';
import Link from 'next/link';
import { getBusinessProfile } from '@/lib/config/business-profile';
import { cn } from '@/lib/utils';

export interface BrandHeaderProps {
  className?: string;
  href?: string;
  title?: string;
  subtitle?: string;
  showSubtitle?: boolean;
  align?: 'left' | 'center';
}

/**
 * Compact text-first brand lockup.
 *
 * This keeps the company name prominent and uses a small logo mark so teams can
 * swap branding quickly without layout changes.
 */
export function BrandHeader({
  className,
  href,
  title,
  subtitle,
  showSubtitle = true,
  align = 'center',
}: BrandHeaderProps) {
  const profile = getBusinessProfile();
  const titleText = title ?? profile.companyName;
  const subtitleText = subtitle ?? profile.industryDescription;
  const alignClass = align === 'center' ? 'mx-auto' : '';

  const lockup = (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-2 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <div className="relative h-7 w-10 shrink-0">
        <Image
          src={profile.assets.logoIconSrc}
          alt={`${profile.companyName} logo mark`}
          fill
          sizes="40px"
          className="object-contain"
          priority
        />
      </div>
      <div className="min-w-0 text-left leading-tight">
        <p className="truncate text-lg font-bold tracking-tight text-primary sm:text-xl">
          {titleText}
        </p>
        {showSubtitle ? (
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
            {subtitleText}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${profile.companyName} home`}
        className={cn('block w-fit', alignClass)}
      >
        {lockup}
      </Link>
    );
  }

  return <div className={cn('w-fit', alignClass)}>{lockup}</div>;
}
