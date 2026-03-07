import rawProfile from '@/config/business-profile.json';

export interface BusinessProfile {
  companyName: string;
  companyShortName: string;
  ownerDisplayName: string;
  industryDescription: string;
  serviceArea: {
    label: string;
    city: string;
    region: string;
    country: string;
  };
  marketing: {
    heroTitle: string;
    heroSubtitle: string;
    tagline: string;
    metaTitle: string;
    metaDescription: string;
    callToActionTitle: string;
  };
  assets: {
    logoIconSrc: string;
    logoHorizontalSrc: string;
    logoStackedSrc: string;
    heroPhotoSrc: string;
    paymentSuccessImageSrc: string;
  };
  sms: {
    programName: string;
    optInIntro: string;
    optOutMessage: string;
    helpIntro: string;
    reviewRequest: string;
    quotePrefix: string;
    invoiceThanks: string;
    acceptedFollowup: string;
  };
  operations: {
    adminActorId: string;
  };
  defaults: {
    websiteUrl: string;
    smsPhoneE164: string;
    callPhoneE164: string;
    adminPhoneE164: string;
    allowedEmails: string[];
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const FALLBACK_PROFILE: BusinessProfile = {
  companyName: 'MainLine',
  companyShortName: 'MainLine',
  ownerDisplayName: 'Your Name',
  industryDescription: 'Field Service & Repairs',
  serviceArea: {
    label: 'Your city and surrounding areas',
    city: 'Your City',
    region: 'Your State',
    country: 'US',
  },
  marketing: {
    heroTitle: 'Reliable service from one accountable operator.',
    heroSubtitle: 'Independent operator. Straight answers. No upsell scripts.',
    tagline: 'If it breaks, we make it work.',
    metaTitle: 'MainLine | Local Field Service & Repairs',
    metaDescription:
      'Customer communication and operations template for local field service businesses.',
    callToActionTitle: 'Ready to get it fixed the right way?',
  },
  assets: {
    logoIconSrc: '/images/mainline/logo-icon.png',
    logoHorizontalSrc: '/images/mainline/logo-horizontal.png',
    logoStackedSrc: '/images/mainline/logo-stacked.png',
    heroPhotoSrc: '/images/hero_shot.png',
    paymentSuccessImageSrc: '/images/template/payment-success.svg',
  },
  sms: {
    programName: 'MainLine Service SMS',
    optInIntro:
      'Thanks for reaching out to {companyName}. Tell us what service issue you are dealing with and we will help.',
    optOutMessage:
      'You have been unsubscribed from {companyName} texts. Reply START to resubscribe.',
    helpIntro: '{companyName} SMS Help',
    reviewRequest:
      'Thanks again for choosing {companyName}. If we earned a 5-star experience, would you leave a quick Google review?',
    quotePrefix: '{companyName} Quote',
    invoiceThanks: 'Thank you for choosing {companyName}!',
    acceptedFollowup: "We'll contact you to schedule your service.",
  },
  operations: {
    adminActorId: 'admin_user',
  },
  defaults: {
    websiteUrl: 'https://example.com',
    smsPhoneE164: '+15551234567',
    callPhoneE164: '+15557654321',
    adminPhoneE164: '+15559876543',
    allowedEmails: ['owner@example.com', 'admin@example.com'],
  },
};

function asString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function asUrl(value: unknown, fallback: string): string {
  const normalized = asString(value, fallback);

  try {
    return new URL(normalized).toString();
  } catch {
    return fallback;
  }
}

function asAssetPath(value: unknown, fallback: string): string {
  const normalized = asString(value, fallback);

  if (normalized.startsWith('/') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return fallback;
}

function asCountry(value: unknown, fallback: string): string {
  const normalized = asString(value, fallback).toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : fallback;
}

function asPhone(value: unknown, fallback: string): string {
  const normalized = asString(value, fallback);
  const digits = normalized.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (normalized.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return fallback;
}

function asEmailList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const emails = value
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
    .filter((entry) => entry.length > 0);

  return emails.length > 0 ? Array.from(new Set(emails)) : fallback;
}

function asActorId(value: unknown, fallback: string): string {
  const normalized = asString(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : fallback;
}

function resolveProfile(input: DeepPartial<BusinessProfile>): BusinessProfile {
  return {
    companyName: asString(input.companyName, FALLBACK_PROFILE.companyName),
    companyShortName: asString(input.companyShortName, FALLBACK_PROFILE.companyShortName),
    ownerDisplayName: asString(input.ownerDisplayName, FALLBACK_PROFILE.ownerDisplayName),
    industryDescription: asString(
      input.industryDescription,
      FALLBACK_PROFILE.industryDescription
    ),
    serviceArea: {
      label: asString(input.serviceArea?.label, FALLBACK_PROFILE.serviceArea.label),
      city: asString(input.serviceArea?.city, FALLBACK_PROFILE.serviceArea.city),
      region: asString(input.serviceArea?.region, FALLBACK_PROFILE.serviceArea.region),
      country: asCountry(input.serviceArea?.country, FALLBACK_PROFILE.serviceArea.country),
    },
    marketing: {
      heroTitle: asString(input.marketing?.heroTitle, FALLBACK_PROFILE.marketing.heroTitle),
      heroSubtitle: asString(
        input.marketing?.heroSubtitle,
        FALLBACK_PROFILE.marketing.heroSubtitle
      ),
      tagline: asString(input.marketing?.tagline, FALLBACK_PROFILE.marketing.tagline),
      metaTitle: asString(input.marketing?.metaTitle, FALLBACK_PROFILE.marketing.metaTitle),
      metaDescription: asString(
        input.marketing?.metaDescription,
        FALLBACK_PROFILE.marketing.metaDescription
      ),
      callToActionTitle: asString(
        input.marketing?.callToActionTitle,
        FALLBACK_PROFILE.marketing.callToActionTitle
      ),
    },
    assets: {
      logoIconSrc: asAssetPath(input.assets?.logoIconSrc, FALLBACK_PROFILE.assets.logoIconSrc),
      logoHorizontalSrc: asAssetPath(
        input.assets?.logoHorizontalSrc,
        FALLBACK_PROFILE.assets.logoHorizontalSrc
      ),
      logoStackedSrc: asAssetPath(
        input.assets?.logoStackedSrc,
        FALLBACK_PROFILE.assets.logoStackedSrc
      ),
      heroPhotoSrc: asAssetPath(input.assets?.heroPhotoSrc, FALLBACK_PROFILE.assets.heroPhotoSrc),
      paymentSuccessImageSrc: asAssetPath(
        input.assets?.paymentSuccessImageSrc,
        FALLBACK_PROFILE.assets.paymentSuccessImageSrc
      ),
    },
    sms: {
      programName: asString(input.sms?.programName, FALLBACK_PROFILE.sms.programName),
      optInIntro: asString(input.sms?.optInIntro, FALLBACK_PROFILE.sms.optInIntro),
      optOutMessage: asString(input.sms?.optOutMessage, FALLBACK_PROFILE.sms.optOutMessage),
      helpIntro: asString(input.sms?.helpIntro, FALLBACK_PROFILE.sms.helpIntro),
      reviewRequest: asString(input.sms?.reviewRequest, FALLBACK_PROFILE.sms.reviewRequest),
      quotePrefix: asString(input.sms?.quotePrefix, FALLBACK_PROFILE.sms.quotePrefix),
      invoiceThanks: asString(input.sms?.invoiceThanks, FALLBACK_PROFILE.sms.invoiceThanks),
      acceptedFollowup: asString(
        input.sms?.acceptedFollowup,
        FALLBACK_PROFILE.sms.acceptedFollowup
      ),
    },
    operations: {
      adminActorId: asActorId(
        input.operations?.adminActorId,
        FALLBACK_PROFILE.operations.adminActorId
      ),
    },
    defaults: {
      websiteUrl: asUrl(input.defaults?.websiteUrl, FALLBACK_PROFILE.defaults.websiteUrl),
      smsPhoneE164: asPhone(
        input.defaults?.smsPhoneE164,
        FALLBACK_PROFILE.defaults.smsPhoneE164
      ),
      callPhoneE164: asPhone(
        input.defaults?.callPhoneE164,
        FALLBACK_PROFILE.defaults.callPhoneE164
      ),
      adminPhoneE164: asPhone(
        input.defaults?.adminPhoneE164,
        FALLBACK_PROFILE.defaults.adminPhoneE164
      ),
      allowedEmails: asEmailList(
        input.defaults?.allowedEmails,
        FALLBACK_PROFILE.defaults.allowedEmails
      ),
    },
  };
}

const resolvedProfile = resolveProfile(rawProfile as DeepPartial<BusinessProfile>);

export function getBusinessProfile(): BusinessProfile {
  return resolvedProfile;
}

export function interpolateBusinessText(
  template: string,
  additionalTokens?: Record<string, string>
): string {
  const profile = getBusinessProfile();
  const tokens: Record<string, string> = {
    companyName: profile.companyName,
    companyShortName: profile.companyShortName,
    ownerDisplayName: profile.ownerDisplayName,
    serviceArea: profile.serviceArea.label,
    city: profile.serviceArea.city,
    region: profile.serviceArea.region,
    country: profile.serviceArea.country,
    industryDescription: profile.industryDescription,
    ...additionalTokens,
  };

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    return tokens[key] ?? `{${key}}`;
  });
}
