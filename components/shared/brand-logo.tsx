import Image from 'next/image';
import { getBusinessProfile } from '@/lib/config/business-profile';

export interface BrandLogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon';
  className?: string;
}

/**
 * BrandLogo Component
 *
 * Displays profile-configured logo assets with layout variants.
 */
export function BrandLogo({
  variant = 'horizontal',
  className = '',
}: BrandLogoProps) {
  const profile = getBusinessProfile();

  if (variant === 'icon') {
    return (
      <div className={`relative mx-auto w-10 md:w-12 lg:w-14 ${className}`}>
        <Image
          src={profile.assets.logoIconSrc}
          alt={profile.companyName}
          width={234}
          height={161}
          sizes="(max-width: 768px) 40px, (max-width: 1024px) 48px, 56px"
          className="h-auto w-full"
          priority
        />
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`relative mx-auto w-[120px] md:w-[145px] lg:w-[170px] ${className}`}>
        <Image
          src={profile.assets.logoStackedSrc}
          alt={`${profile.companyName} logo`}
          width={234}
          height={161}
          sizes="(max-width: 768px) 120px, (max-width: 1024px) 145px, 170px"
          className="h-auto w-full"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`relative mx-auto w-[150px] md:w-[190px] lg:w-[230px] ${className}`}>
      <Image
        src={profile.assets.logoHorizontalSrc}
        alt={`${profile.companyName} logo`}
        width={257}
        height={183}
        sizes="(max-width: 768px) 150px, (max-width: 1024px) 190px, 230px"
        className="h-auto w-full"
        priority
      />
    </div>
  );
}
