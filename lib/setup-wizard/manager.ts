import 'server-only';

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  SetupWizardCheckItem,
  SetupWizardProfileFields,
  SetupWizardProviderFields,
  SetupWizardSavePayload,
  SetupWizardSecretStatus,
  SetupWizardSnapshot,
  WizardMode,
} from '@/lib/setup-wizard/types';
import {
  getPaymentProviderLabel,
  normalizePaymentProvider,
  resolvePaymentProvider,
} from '@/lib/payments/provider';
import {
  isSetupWizardWebEnabled,
  SETUP_WIZARD_PRODUCTION_DISABLED_ERROR,
} from '@/lib/setup-wizard/web-access';

type AnyRecord = Record<string, unknown>;

const repoRoot = process.cwd();
const profilePath = path.join(repoRoot, 'config', 'business-profile.json');
const envLocalPath = path.join(repoRoot, '.env.local');
const envExamplePath = path.join(repoRoot, '.env.example');
const onboardingStatusPath = path.join(repoRoot, 'docs', 'onboarding-status.md');

const FALLBACK_PROFILE: SetupWizardProfileFields = {
  companyName: 'MainLine',
  companyShortName: 'MainLine',
  ownerDisplayName: 'Your Name',
  industryDescription: 'Field Service & Repairs',
  serviceAreaLabel: 'Your city and surrounding areas',
  serviceAreaCity: 'Your City',
  serviceAreaRegion: 'Your State',
  serviceAreaCountry: 'US',
  tagline: 'If it breaks, we make it work.',
};

const FALLBACK_PROVIDERS: SetupWizardProviderFields = {
  paymentProvider: 'none',
  websiteUrl: 'https://example.com',
  allowedEmailsCsv: 'owner@example.com',
  smsPhoneE164: '+15551234567',
  callPhoneE164: '+15557654321',
  adminPhoneE164: '+15559876543',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceRoleKey: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  squareAccessToken: '',
  squareLocationId: '',
  squareWebhookSignatureKey: '',
  squareEnvironment: 'production',
  cronSecret: '',
};

function resolveEditableState(): { editable: boolean; reason: string } {
  if (isSetupWizardWebEnabled()) {
    return {
      editable: true,
      reason: 'Web setup wizard is active in development.',
    };
  }

  return {
    editable: false,
    reason: SETUP_WIZARD_PRODUCTION_DISABLED_ERROR,
  };
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return trimmed;
  }
}

function normalizePhoneToE164(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return trimmed;
}

function normalizeActorId(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : 'admin_user';
}

function splitAllowedEmails(csv: string): string[] {
  return csv
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

function firstAllowedEmail(allowedEmails: string[]): string {
  return allowedEmails[0] || 'owner@example.com';
}

function ensureEnvLocalExists(): void {
  if (fs.existsSync(envLocalPath)) return;

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    return;
  }

  fs.writeFileSync(envLocalPath, '', 'utf8');
}

function readProfile(): AnyRecord {
  const content = fs.readFileSync(profilePath, 'utf8');
  const parsed = JSON.parse(content);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid profile JSON file.');
  }

  return parsed as AnyRecord;
}

function readEnvMap(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    map.set(key, value);
  }

  return map;
}

function envDefault(envMap: Map<string, string>, key: string, fallback = ''): string {
  const value = envMap.get(key);
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function asAnyRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as AnyRecord;
}

const PLACEHOLDER_EXACT_VALUES = new Set([
  'https://example.com',
  'https://your-project-id.supabase.co',
  'your-supabase-anon-key',
  'your-supabase-service-role-key',
  'acxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'your-twilio-auth-token',
  '+15551234567',
  '+15557654321',
  '+15559876543',
  'eaaaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'lxxxxxxxxxxxxxxx',
  'webhooks-signature-key',
  'owner@example.com',
  'admin@example.com',
  'owner@example.com,admin@example.com',
  'replace-with-a-long-random-secret',
  'https://your-domain.com/api/webhooks/square',
  'https://g.page/r/your-google-review-link/review',
]);

function isPresent(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim();
  if (normalized.length === 0) return false;

  const lower = normalized.toLowerCase();
  const compact = lower.replace(/\s+/g, '');

  if (PLACEHOLDER_EXACT_VALUES.has(lower) || PLACEHOLDER_EXACT_VALUES.has(compact)) {
    return false;
  }

  return !lower.includes('your-') &&
    !lower.includes('xxxxxxxx') &&
    !lower.includes('replace-with') &&
    !lower.includes('example.com');
}

function renderStatusLine(label: string, value: string | undefined): string {
  return `- ${isPresent(value) ? 'OK' : 'TODO'} ${label}`;
}

function upsertEnvVar(content: string, key: string, value: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(`^${escapedKey}=.*$`, 'm');
  const nextLine = `${key}=${value}`;

  if (lineRegex.test(content)) {
    return content.replace(lineRegex, nextLine);
  }

  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  return `${normalized}${nextLine}\n`;
}

function deriveProfileFields(rawProfile: AnyRecord): SetupWizardProfileFields {
  const serviceArea = asAnyRecord(rawProfile.serviceArea);
  const marketing = asAnyRecord(rawProfile.marketing);

  return {
    companyName: asString(rawProfile.companyName, FALLBACK_PROFILE.companyName),
    companyShortName: asString(rawProfile.companyShortName, FALLBACK_PROFILE.companyShortName),
    ownerDisplayName: asString(rawProfile.ownerDisplayName, FALLBACK_PROFILE.ownerDisplayName),
    industryDescription: asString(
      rawProfile.industryDescription,
      FALLBACK_PROFILE.industryDescription
    ),
    serviceAreaLabel: asString(serviceArea.label, FALLBACK_PROFILE.serviceAreaLabel),
    serviceAreaCity: asString(serviceArea.city, FALLBACK_PROFILE.serviceAreaCity),
    serviceAreaRegion: asString(serviceArea.region, FALLBACK_PROFILE.serviceAreaRegion),
    serviceAreaCountry: asString(serviceArea.country, FALLBACK_PROFILE.serviceAreaCountry),
    tagline: asString(marketing.tagline, FALLBACK_PROFILE.tagline),
  };
}

function deriveProviderFields(
  rawProfile: AnyRecord,
  envMap: Map<string, string>
): SetupWizardProviderFields {
  const defaults = asAnyRecord(rawProfile.defaults);
  const fallbackAllowedEmails = Array.isArray(defaults.allowedEmails)
    ? defaults.allowedEmails
      .map((value) => String(value).trim().toLowerCase())
      .filter((value) => value.length > 0)
      .join(',')
    : FALLBACK_PROVIDERS.allowedEmailsCsv;

  const websiteUrl = normalizeUrl(
    envDefault(
      envMap,
      'NEXT_PUBLIC_SITE_URL',
      asString(defaults.websiteUrl, FALLBACK_PROVIDERS.websiteUrl)
    )
  );
  const smsPhoneE164 = normalizePhoneToE164(
    envDefault(
      envMap,
      'TWILIO_PHONE_NUMBER',
      asString(defaults.smsPhoneE164, FALLBACK_PROVIDERS.smsPhoneE164)
    )
  );
  const callPhoneE164 = normalizePhoneToE164(
    envDefault(
      envMap,
      'BUSINESS_PHONE_NUMBER',
      asString(defaults.callPhoneE164, smsPhoneE164 || FALLBACK_PROVIDERS.callPhoneE164)
    )
  );
  const adminPhoneE164 = normalizePhoneToE164(
    envDefault(
      envMap,
      'ADMIN_PHONE_NUMBER',
      asString(defaults.adminPhoneE164, callPhoneE164 || FALLBACK_PROVIDERS.adminPhoneE164)
    )
  );
  const paymentProvider = resolvePaymentProvider({
    paymentProvider: envDefault(envMap, 'PAYMENT_PROVIDER', ''),
    squareAccessToken: envMap.get('SQUARE_ACCESS_TOKEN'),
    squareLocationId: envMap.get('SQUARE_LOCATION_ID'),
    squareWebhookSignatureKey: envMap.get('SQUARE_WEBHOOK_SIGNATURE_KEY'),
  });

  return {
    paymentProvider,
    websiteUrl: websiteUrl || FALLBACK_PROVIDERS.websiteUrl,
    allowedEmailsCsv: envDefault(envMap, 'ALLOWED_EMAILS', fallbackAllowedEmails),
    smsPhoneE164: smsPhoneE164 || FALLBACK_PROVIDERS.smsPhoneE164,
    callPhoneE164: callPhoneE164 || FALLBACK_PROVIDERS.callPhoneE164,
    adminPhoneE164: adminPhoneE164 || FALLBACK_PROVIDERS.adminPhoneE164,
    supabaseUrl: normalizeUrl(envDefault(envMap, 'NEXT_PUBLIC_SUPABASE_URL', '')),
    // Hide secret values in UI snapshots; user can leave blank to keep existing.
    supabaseAnonKey: '',
    supabaseServiceRoleKey: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    squareAccessToken: '',
    squareLocationId: envDefault(envMap, 'SQUARE_LOCATION_ID', ''),
    squareWebhookSignatureKey: '',
    squareEnvironment:
      envDefault(envMap, 'SQUARE_ENVIRONMENT', 'production').toLowerCase() === 'sandbox'
        ? 'sandbox'
        : 'production',
    cronSecret: '',
  };
}

function deriveSecretStatus(envMap: Map<string, string>): SetupWizardSecretStatus {
  return {
    supabaseAnonKeySaved: isPresent(envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')),
    supabaseServiceRoleKeySaved: isPresent(envMap.get('SUPABASE_SERVICE_ROLE_KEY')),
    twilioAccountSidSaved: isPresent(envMap.get('TWILIO_ACCOUNT_SID')),
    twilioAuthTokenSaved: isPresent(envMap.get('TWILIO_AUTH_TOKEN')),
    squareAccessTokenSaved: isPresent(envMap.get('SQUARE_ACCESS_TOKEN')),
    squareLocationIdSaved: isPresent(envMap.get('SQUARE_LOCATION_ID')),
    squareWebhookSignatureKeySaved: isPresent(envMap.get('SQUARE_WEBHOOK_SIGNATURE_KEY')),
    cronSecretSaved: isPresent(envMap.get('CRON_SECRET')),
  };
}

function deriveChecks(envMap: Map<string, string>): SetupWizardCheckItem[] {
  const paymentProvider = resolvePaymentProvider({
    paymentProvider: envMap.get('PAYMENT_PROVIDER'),
    squareAccessToken: envMap.get('SQUARE_ACCESS_TOKEN'),
    squareLocationId: envMap.get('SQUARE_LOCATION_ID'),
    squareWebhookSignatureKey: envMap.get('SQUARE_WEBHOOK_SIGNATURE_KEY'),
  });
  const checks: SetupWizardCheckItem[] = [
    { group: 'Core App', label: 'Supabase URL', key: 'NEXT_PUBLIC_SUPABASE_URL', ready: isPresent(envMap.get('NEXT_PUBLIC_SUPABASE_URL')) },
    { group: 'Core App', label: 'Supabase Anon Key', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', ready: isPresent(envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')) },
    { group: 'Core App', label: 'Supabase Service Key', key: 'SUPABASE_SERVICE_ROLE_KEY', ready: isPresent(envMap.get('SUPABASE_SERVICE_ROLE_KEY')) },
    { group: 'Core App', label: 'Public Site URL', key: 'NEXT_PUBLIC_SITE_URL', ready: isPresent(envMap.get('NEXT_PUBLIC_SITE_URL')) },
    { group: 'Core App', label: 'Admin Allowlist Emails', key: 'ALLOWED_EMAILS', ready: isPresent(envMap.get('ALLOWED_EMAILS')) },
    { group: 'Twilio SMS', label: 'Twilio Account SID', key: 'TWILIO_ACCOUNT_SID', ready: isPresent(envMap.get('TWILIO_ACCOUNT_SID')) },
    { group: 'Twilio SMS', label: 'Twilio Auth Token', key: 'TWILIO_AUTH_TOKEN', ready: isPresent(envMap.get('TWILIO_AUTH_TOKEN')) },
    { group: 'Twilio SMS', label: 'Twilio Number', key: 'TWILIO_PHONE_NUMBER', ready: isPresent(envMap.get('TWILIO_PHONE_NUMBER')) },
  ];

  if (paymentProvider === 'square') {
    checks.push(
      {
        group: 'Payments',
        label: `Payment Provider (${getPaymentProviderLabel(paymentProvider)})`,
        key: 'PAYMENT_PROVIDER',
        ready: true,
      },
      { group: 'Payments', label: 'Square Access Token', key: 'SQUARE_ACCESS_TOKEN', ready: isPresent(envMap.get('SQUARE_ACCESS_TOKEN')) },
      { group: 'Payments', label: 'Square Location ID', key: 'SQUARE_LOCATION_ID', ready: isPresent(envMap.get('SQUARE_LOCATION_ID')) },
      { group: 'Payments', label: 'Square Webhook Signature Key', key: 'SQUARE_WEBHOOK_SIGNATURE_KEY', ready: isPresent(envMap.get('SQUARE_WEBHOOK_SIGNATURE_KEY')) }
    );
  } else {
    checks.push({
      group: 'Payments',
      label: 'Payment Provider (None - online payments disabled)',
      key: 'PAYMENT_PROVIDER',
      ready: true,
    });
  }

  return checks;
}

function writeOnboardingStatus(siteUrl: string, envMap: Map<string, string>): void {
  const coreKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'ALLOWED_EMAILS',
  ];

  const twilioKeys = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
  ];

  const squareKeys = [
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_LOCATION_ID',
    'SQUARE_WEBHOOK_SIGNATURE_KEY',
  ];
  const paymentProvider = resolvePaymentProvider({
    paymentProvider: envMap.get('PAYMENT_PROVIDER'),
    squareAccessToken: envMap.get('SQUARE_ACCESS_TOKEN'),
    squareLocationId: envMap.get('SQUARE_LOCATION_ID'),
    squareWebhookSignatureKey: envMap.get('SQUARE_WEBHOOK_SIGNATURE_KEY'),
  });

  const webhookBase = siteUrl || 'https://<your-domain>';

  const lines: string[] = [
    '# Onboarding Status',
    '',
    'This file is generated by `npm run wizard:setup` or the web setup wizard.',
    '',
    '## What This Software Does (Plain English)',
    '',
    '- Keeps customer texts, quotes, invoices, and payment links in one place.',
    '- Lets you message customers from the dashboard using your business number.',
    paymentProvider === 'square'
      ? '- Sends payment links and marks invoices paid when Square confirms payment.'
      : '- Online invoice payments are disabled right now. Enable Square later if you want pay-by-link invoices.',
    '- Keeps your service conversations and records organized by customer.',
    '',
    '## Current Setup Status',
    '',
    '### Core App (required)',
    ...coreKeys.map((key) => renderStatusLine(key, envMap.get(key))),
    '',
    '### SMS (Twilio)',
    ...twilioKeys.map((key) => renderStatusLine(key, envMap.get(key))),
    '',
    paymentProvider === 'square' ? '### Payments (Square)' : '### Payments',
    paymentProvider === 'square'
      ? renderStatusLine('PAYMENT_PROVIDER (square)', 'square')
      : '- OK PAYMENT_PROVIDER=none (online payment links disabled)',
    ...(paymentProvider === 'square'
      ? squareKeys.map((key) => renderStatusLine(key, envMap.get(key)))
      : []),
    '',
    '## Next External Dashboard Steps',
    '',
    '1. Supabase',
    '   - Create project and copy URL + anon key + service role key.',
    '   - Dashboard: https://supabase.com/dashboard',
    '',
    '2. Twilio',
    `   - Set Messaging webhook URL to: ${webhookBase}/api/webhooks/twilio`,
    `   - Set Status callback URL to: ${webhookBase}/api/webhooks/twilio/status`,
    '   - Dashboard: https://console.twilio.com/',
    '',
    ...(paymentProvider === 'square'
      ? [
          '3. Square',
          `   - Set Webhook URL to: ${webhookBase}/api/webhooks/square`,
          '   - Copy access token, location ID, and webhook signature key.',
          '   - Dashboard: https://developer.squareup.com/apps',
          '',
          '4. Vercel',
        ]
      : ['3. Vercel']),
    '   - Add all environment variables from `.env.local` to your Vercel project.',
    '   - Deploy: `vercel deploy --prod --yes`',
    '   - Dashboard: https://vercel.com/dashboard',
    '',
    '## Final Verification',
    '',
    '- Log in with an email in `ALLOWED_EMAILS`.',
    '- Send and receive one real SMS.',
    paymentProvider === 'square'
      ? '- Send one invoice and complete one test payment.'
      : '- If you want online invoice payments later, set `PAYMENT_PROVIDER=square` and add your Square credentials.',
  ];

  fs.writeFileSync(onboardingStatusPath, `${lines.join('\n')}\n`, 'utf8');
}

function pickIncomingString(input: string, fallback: string): string {
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function computeProviderValues(
  input: SetupWizardProviderFields,
  existingEnvMap: Map<string, string>,
  rawProfile: AnyRecord
): SetupWizardProviderFields {
  const defaults = asAnyRecord(rawProfile.defaults);

  const existingWebsite = normalizeUrl(
    envDefault(
      existingEnvMap,
      'NEXT_PUBLIC_SITE_URL',
      asString(defaults.websiteUrl, FALLBACK_PROVIDERS.websiteUrl)
    )
  );
  const websiteUrl = normalizeUrl(pickIncomingString(input.websiteUrl, existingWebsite)) || existingWebsite;

  const existingAllowedEmails = envDefault(
    existingEnvMap,
    'ALLOWED_EMAILS',
    FALLBACK_PROVIDERS.allowedEmailsCsv
  );
  const allowedEmailsCsv = pickIncomingString(input.allowedEmailsCsv, existingAllowedEmails);

  const existingSmsPhone = normalizePhoneToE164(
    envDefault(
      existingEnvMap,
      'TWILIO_PHONE_NUMBER',
      asString(defaults.smsPhoneE164, FALLBACK_PROVIDERS.smsPhoneE164)
    )
  );
  const smsPhoneE164 = normalizePhoneToE164(
    pickIncomingString(input.smsPhoneE164, existingSmsPhone)
  ) || existingSmsPhone;

  const existingCallPhone = normalizePhoneToE164(
    envDefault(
      existingEnvMap,
      'BUSINESS_PHONE_NUMBER',
      asString(defaults.callPhoneE164, smsPhoneE164 || FALLBACK_PROVIDERS.callPhoneE164)
    )
  );
  const callPhoneE164 = normalizePhoneToE164(
    pickIncomingString(input.callPhoneE164, existingCallPhone)
  ) || existingCallPhone;

  const existingAdminPhone = normalizePhoneToE164(
    envDefault(
      existingEnvMap,
      'ADMIN_PHONE_NUMBER',
      asString(defaults.adminPhoneE164, callPhoneE164 || FALLBACK_PROVIDERS.adminPhoneE164)
    )
  );
  const adminPhoneE164 = normalizePhoneToE164(
    pickIncomingString(input.adminPhoneE164, existingAdminPhone)
  ) || existingAdminPhone;

  const supabaseUrl = normalizeUrl(
    pickIncomingString(
      input.supabaseUrl,
      envDefault(existingEnvMap, 'NEXT_PUBLIC_SUPABASE_URL', '')
    )
  );
  const paymentProvider = normalizePaymentProvider(input.paymentProvider);

  const squareEnvironment: 'sandbox' | 'production' =
    input.squareEnvironment === 'sandbox' ? 'sandbox' : 'production';

  const generateCron = () => randomBytes(24).toString('hex');
  const cronSecret = pickIncomingString(
    input.cronSecret,
    envDefault(existingEnvMap, 'CRON_SECRET', generateCron())
  );

  return {
    paymentProvider,
    websiteUrl: websiteUrl || FALLBACK_PROVIDERS.websiteUrl,
    allowedEmailsCsv,
    smsPhoneE164: smsPhoneE164 || FALLBACK_PROVIDERS.smsPhoneE164,
    callPhoneE164: callPhoneE164 || FALLBACK_PROVIDERS.callPhoneE164,
    adminPhoneE164: adminPhoneE164 || FALLBACK_PROVIDERS.adminPhoneE164,
    supabaseUrl,
    supabaseAnonKey: pickIncomingString(
      input.supabaseAnonKey,
      envDefault(existingEnvMap, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    ),
    supabaseServiceRoleKey: pickIncomingString(
      input.supabaseServiceRoleKey,
      envDefault(existingEnvMap, 'SUPABASE_SERVICE_ROLE_KEY', '')
    ),
    twilioAccountSid: pickIncomingString(
      input.twilioAccountSid,
      envDefault(existingEnvMap, 'TWILIO_ACCOUNT_SID', '')
    ),
    twilioAuthToken: pickIncomingString(
      input.twilioAuthToken,
      envDefault(existingEnvMap, 'TWILIO_AUTH_TOKEN', '')
    ),
    squareAccessToken: pickIncomingString(
      input.squareAccessToken,
      envDefault(existingEnvMap, 'SQUARE_ACCESS_TOKEN', '')
    ),
    squareLocationId: pickIncomingString(
      input.squareLocationId,
      envDefault(existingEnvMap, 'SQUARE_LOCATION_ID', '')
    ),
    squareWebhookSignatureKey: pickIncomingString(
      input.squareWebhookSignatureKey,
      envDefault(existingEnvMap, 'SQUARE_WEBHOOK_SIGNATURE_KEY', '')
    ),
    squareEnvironment,
    cronSecret,
  };
}

function updateProfileDocument(
  rawProfile: AnyRecord,
  mode: WizardMode,
  profileFields: SetupWizardProfileFields,
  providerFields: SetupWizardProviderFields
): AnyRecord {
  const defaults = asAnyRecord(rawProfile.defaults);
  const operations = asAnyRecord(rawProfile.operations);
  const marketing = asAnyRecord(rawProfile.marketing);
  const serviceArea = asAnyRecord(rawProfile.serviceArea);

  const allowedEmails = splitAllowedEmails(providerFields.allowedEmailsCsv);
  const primaryEmail = firstAllowedEmail(allowedEmails);

  const nextBase: AnyRecord = {
    ...rawProfile,
    operations: {
      ...operations,
      adminActorId: normalizeActorId(primaryEmail.split('@')[0] || 'admin_user'),
    },
    defaults: {
      ...defaults,
      websiteUrl: providerFields.websiteUrl,
      smsPhoneE164: providerFields.smsPhoneE164,
      callPhoneE164: providerFields.callPhoneE164,
      adminPhoneE164: providerFields.adminPhoneE164,
      allowedEmails,
    },
  };

  if (mode === 'doctor') {
    return nextBase;
  }

  return {
    ...nextBase,
    companyName: profileFields.companyName,
    companyShortName: profileFields.companyShortName,
    ownerDisplayName: profileFields.ownerDisplayName,
    industryDescription: profileFields.industryDescription,
    serviceArea: {
      ...serviceArea,
      label: profileFields.serviceAreaLabel,
      city: profileFields.serviceAreaCity,
      region: profileFields.serviceAreaRegion,
      country: profileFields.serviceAreaCountry.toUpperCase(),
    },
    marketing: {
      ...marketing,
      tagline: profileFields.tagline,
      metaTitle: `${profileFields.companyName} | ${profileFields.industryDescription}`,
      metaDescription: `Customer communication and operations platform for ${profileFields.industryDescription.toLowerCase()} businesses.`,
    },
  };
}

function applyEnvUpdates(content: string, providerFields: SetupWizardProviderFields): string {
  const allowedEmails = splitAllowedEmails(providerFields.allowedEmailsCsv);
  const normalizedAllowedEmails =
    allowedEmails.length > 0 ? allowedEmails.join(',') : 'owner@example.com';

  const updates: Array<[string, string]> = [
    ['PAYMENT_PROVIDER', providerFields.paymentProvider],
    ['NEXT_PUBLIC_SITE_URL', providerFields.websiteUrl],
    ['ALLOWED_EMAILS', normalizedAllowedEmails],
    ['TWILIO_PHONE_NUMBER', providerFields.smsPhoneE164],
    ['BUSINESS_PHONE_NUMBER', providerFields.callPhoneE164],
    ['ADMIN_PHONE_NUMBER', providerFields.adminPhoneE164],
    ['SQUARE_ENVIRONMENT', providerFields.squareEnvironment],
    ['CRON_SECRET', providerFields.cronSecret],
  ];

  if (providerFields.paymentProvider === 'square') {
    updates.push([
      'SQUARE_WEBHOOK_NOTIFICATION_URL',
      `${providerFields.websiteUrl}/api/webhooks/square`,
    ]);
  }

  if (providerFields.supabaseUrl) {
    updates.push(['NEXT_PUBLIC_SUPABASE_URL', providerFields.supabaseUrl]);
  }
  if (providerFields.supabaseAnonKey) {
    updates.push(['NEXT_PUBLIC_SUPABASE_ANON_KEY', providerFields.supabaseAnonKey]);
  }
  if (providerFields.supabaseServiceRoleKey) {
    updates.push(['SUPABASE_SERVICE_ROLE_KEY', providerFields.supabaseServiceRoleKey]);
  }
  if (providerFields.twilioAccountSid) {
    updates.push(['TWILIO_ACCOUNT_SID', providerFields.twilioAccountSid]);
  }
  if (providerFields.twilioAuthToken) {
    updates.push(['TWILIO_AUTH_TOKEN', providerFields.twilioAuthToken]);
  }
  if (providerFields.squareAccessToken) {
    updates.push(['SQUARE_ACCESS_TOKEN', providerFields.squareAccessToken]);
  }
  if (providerFields.squareLocationId) {
    updates.push(['SQUARE_LOCATION_ID', providerFields.squareLocationId]);
  }
  if (providerFields.squareWebhookSignatureKey) {
    updates.push(['SQUARE_WEBHOOK_SIGNATURE_KEY', providerFields.squareWebhookSignatureKey]);
  }

  let next = content;
  for (const [key, value] of updates) {
    next = upsertEnvVar(next, key, value);
  }

  return next;
}

export function getSetupWizardSnapshot(): SetupWizardSnapshot {
  const rawProfile = readProfile();
  const envContent = fs.existsSync(envLocalPath)
    ? fs.readFileSync(envLocalPath, 'utf8')
    : fs.existsSync(envExamplePath)
      ? fs.readFileSync(envExamplePath, 'utf8')
      : '';
  const envMap = readEnvMap(envContent);
  const editableState = resolveEditableState();

  return {
    editable: editableState.editable,
    editableReason: editableState.reason,
    profile: deriveProfileFields(rawProfile),
    providers: deriveProviderFields(rawProfile, envMap),
    secretStatus: deriveSecretStatus(envMap),
    checks: deriveChecks(envMap),
    onboardingStatusPath: path.relative(repoRoot, onboardingStatusPath),
    updatedAtIso: new Date().toISOString(),
  };
}

export function saveSetupWizardConfiguration(payload: SetupWizardSavePayload): SetupWizardSnapshot {
  const editableState = resolveEditableState();
  if (!editableState.editable) {
    throw new Error(editableState.reason);
  }

  ensureEnvLocalExists();
  const rawProfile = readProfile();
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envMap = readEnvMap(envContent);
  const providerFields = computeProviderValues(payload.providers, envMap, rawProfile);
  const nextProfile = updateProfileDocument(rawProfile, payload.mode, payload.profile, providerFields);

  fs.writeFileSync(profilePath, `${JSON.stringify(nextProfile, null, 2)}\n`, 'utf8');

  const nextEnvContent = applyEnvUpdates(envContent, providerFields);
  fs.writeFileSync(envLocalPath, nextEnvContent, 'utf8');

  const nextEnvMap = readEnvMap(nextEnvContent);
  writeOnboardingStatus(providerFields.websiteUrl, nextEnvMap);

  return getSetupWizardSnapshot();
}
