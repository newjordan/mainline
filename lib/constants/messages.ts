import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils/format-phone';
import {
  getBusinessProfile,
  interpolateBusinessText,
} from '@/lib/config/business-profile';

/**
 * Message constants for automated responses
 * Keep messages short, friendly, and professional
 *
 * SMS Compliance: All messages include required opt-out language
 */

const businessProfile = getBusinessProfile();
const companyName = businessProfile.companyName;
const DEFAULT_CALL_PHONE = businessProfile.defaults.callPhoneE164;
const DEFAULT_SITE_URL = businessProfile.defaults.websiteUrl;

function getCallPhoneDisplay(): string {
  const phone = process.env.BUSINESS_PHONE_NUMBER || DEFAULT_CALL_PHONE;
  return formatPhoneNumber(normalizePhoneNumber(phone));
}

function getSiteHost(): string {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
    return new URL(siteUrl).host;
  } catch {
    return new URL(DEFAULT_SITE_URL).host;
  }
}

const callPhoneDisplay = getCallPhoneDisplay();
const siteHost = getSiteHost();

/**
 * Opt-in request sent to first-time texters (before consent)
 * Includes required compliance disclosures
 */
export const SMS_OPT_IN_REQUEST = `${companyName}: By replying START, you agree to receive service updates, quotes, invoices, and appointment information via SMS. Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help.`;

/**
 * Confirmation sent after customer opts in with START
 * Leads with empathy, then eases into info gathering
 */
export const SMS_OPT_IN_CONFIRMED = `${interpolateBusinessText(
  businessProfile.sms.optInIntro
)}

Reply STOP anytime to unsubscribe.`;

/**
 * Response to STOP keyword - opt-out confirmation
 */
export const SMS_OPT_OUT_CONFIRMED = interpolateBusinessText(
  businessProfile.sms.optOutMessage
);

/**
 * Response to HELP keyword
 */
export const SMS_HELP_RESPONSE = `${interpolateBusinessText(
  businessProfile.sms.helpIntro
)}: For service questions, reply with your issue or call ${callPhoneDisplay}. To stop texts, reply STOP. To resubscribe, reply START. Message and data rates may apply. Visit ${siteHost}`;

/**
 * Sent when non-opted-in customer tries to message
 * Reminds them to opt in first
 */
export const SMS_NOT_OPTED_IN = `Please reply START to receive texts from ${companyName}. Message and data rates may apply.`;

/**
 * Legacy: Auto-response for new opted-in customers
 * @deprecated Use SMS_OPT_IN_CONFIRMED instead
 */
export const NEW_CUSTOMER_AUTO_RESPONSE = SMS_OPT_IN_CONFIRMED;
