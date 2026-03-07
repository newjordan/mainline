import Image from 'next/image';
import { getBusinessProfile } from '@/lib/config/business-profile';

/**
 * OwnerPhoto Component
 *
 * Renders the owner portrait configured in the business profile.
 */
export function OwnerPhoto() {
  const profile = getBusinessProfile();

  return (
    <div className="relative mx-auto mb-6 h-64 w-48 overflow-hidden rounded-2xl border border-primary/20 bg-card p-1 shadow-[0_14px_28px_hsl(var(--primary)/0.18)] md:h-80 md:w-60 lg:h-96 lg:w-72">
      <Image
        src={profile.assets.heroPhotoSrc}
        alt={`${profile.ownerDisplayName} portrait`}
        fill
        sizes="(max-width: 768px) 192px, (max-width: 1024px) 240px, 288px"
        className="rounded-[0.9rem] object-cover object-top"
        priority
      />
    </div>
  );
}
