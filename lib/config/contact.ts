import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils/format-phone';
import { getBusinessProfile } from '@/lib/config/business-profile';

const businessProfile = getBusinessProfile();
const DEFAULT_SITE_URL = businessProfile.defaults.websiteUrl;
const DEFAULT_SMS_PHONE = businessProfile.defaults.smsPhoneE164;
const DEFAULT_CALL_PHONE = businessProfile.defaults.callPhoneE164;

function resolveSiteUrl(value: string | undefined): string {
  if (!value) {
    return DEFAULT_SITE_URL;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return DEFAULT_SITE_URL;
  }

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function resolvePhone(value: string | undefined, fallback: string): string {
  if (!value || value.trim() === '') {
    return fallback;
  }

  return normalizePhoneNumber(value.trim());
}

/**
 * Canonical public contact and CTA config.
 *
 * SMS number is sourced from TWILIO_PHONE_NUMBER to keep campaign CTA and
 * sender identity aligned.
 */
export function getPublicContactConfig() {
  const smsPhoneE164 = resolvePhone(process.env.TWILIO_PHONE_NUMBER, DEFAULT_SMS_PHONE);
  const callPhoneE164 = resolvePhone(process.env.BUSINESS_PHONE_NUMBER, DEFAULT_CALL_PHONE);
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  return {
    siteUrl,
    smsPhoneE164,
    smsPhoneDisplay: formatPhoneNumber(smsPhoneE164),
    smsHref: `sms:${smsPhoneE164}`,
    smsOptInUrl: `${siteUrl}/sms-opt-in`,
    callPhoneE164,
    callPhoneDisplay: formatPhoneNumber(callPhoneE164),
    callHref: `tel:${callPhoneE164}`,
    termsUrl: `${siteUrl}/terms`,
    privacyUrl: `${siteUrl}/privacy`,
  };
}
