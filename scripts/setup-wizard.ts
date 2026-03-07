import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import {
  getPaymentProviderLabel,
  normalizePaymentProvider,
  resolvePaymentProvider,
  type PaymentProvider,
} from '../lib/payments/provider';

type AnyRecord = Record<string, unknown>;
type WizardMode = 'full' | 'doctor';

type ProfileAnswers = {
  companyName: string;
  companyShortName: string;
  ownerDisplayName: string;
  industryDescription: string;
  serviceAreaLabel: string;
  serviceAreaCity: string;
  serviceAreaRegion: string;
  serviceAreaCountry: string;
  tagline: string;
};

type ProviderAnswers = {
  paymentProvider: PaymentProvider;
  websiteUrl: string;
  allowedEmailsCsv: string;
  smsPhoneE164: string;
  callPhoneE164: string;
  adminPhoneE164: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  squareAccessToken: string;
  squareLocationId: string;
  squareWebhookSignatureKey: string;
  squareEnvironment: 'sandbox' | 'production';
  cronSecret: string;
};

const repoRoot = process.cwd();
const profilePath = path.join(repoRoot, 'config', 'business-profile.json');
const envLocalPath = path.join(repoRoot, '.env.local');
const envExamplePath = path.join(repoRoot, '.env.example');
const onboardingReportPath = path.join(repoRoot, 'docs', 'onboarding-status.md');

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
  if (fs.existsSync(envLocalPath)) {
    return;
  }

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    return;
  }

  fs.writeFileSync(envLocalPath, '', 'utf8');
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
    'This file is generated by `npm run wizard:setup`.',
    'Re-run the wizard anytime and choose "Project Doctor" to update provider keys.',
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
      ? renderStatusLine(`PAYMENT_PROVIDER (${getPaymentProviderLabel(paymentProvider)})`, paymentProvider)
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

  fs.writeFileSync(onboardingReportPath, `${lines.join('\n')}\n`, 'utf8');
}

function parseModeToken(input: string): WizardMode | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  if (['1', 'full', 'setup', 'full-setup', '--full'].includes(normalized)) {
    return 'full';
  }

  if (
    ['2', 'doctor', 'project-doctor', 'provider', 'providers', '--doctor'].includes(
      normalized
    )
  ) {
    return 'doctor';
  }

  return null;
}

function parseModeFromArgs(args: string[]): WizardMode | null {
  for (const arg of args) {
    const parsed = parseModeToken(arg);
    if (parsed) return parsed;
  }

  return null;
}

async function prompt(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultValue = ''
): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const response = (await rl.question(`${label}${suffix}: `)).trim();
  return response || defaultValue;
}

async function promptKeepExisting(
  rl: ReturnType<typeof createInterface>,
  label: string,
  existingValue: string
): Promise<string> {
  const suffix = existingValue ? ' [saved: press Enter to keep]' : '';
  const response = (await rl.question(`${label}${suffix}: `)).trim();
  return response || existingValue;
}

async function promptMode(rl: ReturnType<typeof createInterface>): Promise<WizardMode> {
  console.log('Choose mode:');
  console.log('1) Full Setup (business profile + provider keys)');
  console.log('2) Project Doctor (provider/API keys only)\n');

  const selected = await prompt(rl, 'Mode', '1');
  return parseModeToken(selected) || 'full';
}

async function collectProfileAnswers(
  rl: ReturnType<typeof createInterface>,
  profile: AnyRecord
): Promise<ProfileAnswers> {
  const currentCompanyName = String(profile.companyName || 'MainLine');
  const currentShortName = String(profile.companyShortName || 'MainLine');
  const currentOwnerName = String(profile.ownerDisplayName || 'Your Name');
  const currentIndustry = String(profile.industryDescription || 'Field Service & Repairs');
  const currentTagline = String(
    ((profile.marketing as AnyRecord)?.tagline as string) ||
      'If it breaks, we make it work.'
  );

  const currentServiceArea = (profile.serviceArea as AnyRecord) || {};

  const companyName = await prompt(rl, 'Business name', currentCompanyName);
  const companyShortName = await prompt(
    rl,
    'Short business name (header)',
    currentShortName
  );
  const ownerDisplayName = await prompt(rl, 'Owner name shown on landing page', currentOwnerName);
  const industryDescription = await prompt(
    rl,
    'Service type (example: Field Service & Repairs)',
    currentIndustry
  );
  const tagline = await prompt(rl, 'Tagline', currentTagline);

  const serviceAreaLabel = await prompt(
    rl,
    'Service area label (example: North side and surrounding areas)',
    String(currentServiceArea.label || 'Your city and surrounding areas')
  );
  const serviceAreaCity = await prompt(
    rl,
    'Primary city',
    String(currentServiceArea.city || 'Your City')
  );
  const serviceAreaRegion = await prompt(
    rl,
    'State/Region code',
    String(currentServiceArea.region || 'Your State')
  );
  const serviceAreaCountry = await prompt(
    rl,
    'Country code',
    String(currentServiceArea.country || 'US')
  );

  return {
    companyName,
    companyShortName,
    ownerDisplayName,
    industryDescription,
    serviceAreaLabel,
    serviceAreaCity,
    serviceAreaRegion,
    serviceAreaCountry,
    tagline,
  };
}

async function collectProviderAnswers(
  rl: ReturnType<typeof createInterface>,
  defaults: ProviderAnswers
): Promise<ProviderAnswers> {
  console.log('\nProvider/API Setup');
  console.log('Press Enter to keep existing values.\n');

  const paymentProvider = normalizePaymentProvider(
    await prompt(rl, 'PAYMENT_PROVIDER (square or none)', defaults.paymentProvider)
  );

  const websiteUrl = normalizeUrl(
    await prompt(rl, 'Public website URL (NEXT_PUBLIC_SITE_URL)', defaults.websiteUrl)
  );
  const allowedEmailsCsv = await prompt(
    rl,
    'Admin access emails, comma-separated (ALLOWED_EMAILS)',
    defaults.allowedEmailsCsv
  );

  const smsPhoneE164 = normalizePhoneToE164(
    await prompt(
      rl,
      'Business text number (TWILIO_PHONE_NUMBER, E.164 or 10-digit)',
      defaults.smsPhoneE164
    )
  );
  const callPhoneE164 = normalizePhoneToE164(
    await prompt(
      rl,
      'Business call number (BUSINESS_PHONE_NUMBER, E.164 or 10-digit)',
      defaults.callPhoneE164
    )
  );
  const adminPhoneE164 = normalizePhoneToE164(
    await prompt(
      rl,
      'Admin alert phone (ADMIN_PHONE_NUMBER, E.164 or 10-digit)',
      defaults.adminPhoneE164
    )
  );

  console.log('\nSupabase keys (Project Settings -> API):');
  const supabaseUrl = normalizeUrl(
    await prompt(rl, 'NEXT_PUBLIC_SUPABASE_URL', defaults.supabaseUrl)
  );
  const supabaseAnonKey = await promptKeepExisting(
    rl,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    defaults.supabaseAnonKey
  );
  const supabaseServiceRoleKey = await promptKeepExisting(
    rl,
    'SUPABASE_SERVICE_ROLE_KEY',
    defaults.supabaseServiceRoleKey
  );

  console.log('\nTwilio keys (Account Dashboard + Phone Number settings):');
  const twilioAccountSid = await promptKeepExisting(
    rl,
    'TWILIO_ACCOUNT_SID',
    defaults.twilioAccountSid
  );
  const twilioAuthToken = await promptKeepExisting(
    rl,
    'TWILIO_AUTH_TOKEN',
    defaults.twilioAuthToken
  );

  let squareAccessToken = defaults.squareAccessToken;
  let squareLocationId = defaults.squareLocationId;
  let squareWebhookSignatureKey = defaults.squareWebhookSignatureKey;
  let squareEnvironment: 'sandbox' | 'production' = defaults.squareEnvironment;

  if (paymentProvider === 'square') {
    console.log('\nSquare keys (Developer Dashboard -> Apps):');
    squareAccessToken = await promptKeepExisting(rl, 'SQUARE_ACCESS_TOKEN', defaults.squareAccessToken);
    squareLocationId = await promptKeepExisting(rl, 'SQUARE_LOCATION_ID', defaults.squareLocationId);
    squareWebhookSignatureKey = await promptKeepExisting(
      rl,
      'SQUARE_WEBHOOK_SIGNATURE_KEY',
      defaults.squareWebhookSignatureKey
    );

    const squareEnvironmentRaw = (
      await prompt(rl, 'SQUARE_ENVIRONMENT (production or sandbox)', defaults.squareEnvironment)
    ).toLowerCase();
    squareEnvironment = squareEnvironmentRaw === 'sandbox' ? 'sandbox' : 'production';
  } else {
    console.log('\nOnline payments disabled. Skipping Square credential prompts.');
  }

  const cronSecret = await promptKeepExisting(rl, 'CRON_SECRET', defaults.cronSecret);

  return {
    paymentProvider,
    websiteUrl,
    allowedEmailsCsv,
    smsPhoneE164,
    callPhoneE164,
    adminPhoneE164,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    twilioAccountSid,
    twilioAuthToken,
    squareAccessToken,
    squareLocationId,
    squareWebhookSignatureKey,
    squareEnvironment,
    cronSecret,
  };
}

function updateFullProfile(
  profile: AnyRecord,
  profileAnswers: ProfileAnswers,
  providerAnswers: ProviderAnswers
): AnyRecord {
  const allowedEmails = splitAllowedEmails(providerAnswers.allowedEmailsCsv);
  const primaryAdminEmail = firstAllowedEmail(allowedEmails);

  return {
    ...profile,
    companyName: profileAnswers.companyName,
    companyShortName: profileAnswers.companyShortName,
    ownerDisplayName: profileAnswers.ownerDisplayName,
    industryDescription: profileAnswers.industryDescription,
    serviceArea: {
      ...(profile.serviceArea as AnyRecord),
      label: profileAnswers.serviceAreaLabel,
      city: profileAnswers.serviceAreaCity,
      region: profileAnswers.serviceAreaRegion,
      country: profileAnswers.serviceAreaCountry.toUpperCase(),
    },
    marketing: {
      ...(profile.marketing as AnyRecord),
      tagline: profileAnswers.tagline,
      metaTitle: `${profileAnswers.companyName} | ${profileAnswers.industryDescription}`,
      metaDescription: `Customer communication and operations platform for ${profileAnswers.industryDescription.toLowerCase()} businesses.`,
    },
    operations: {
      ...(profile.operations as AnyRecord),
      adminActorId: normalizeActorId(primaryAdminEmail.split('@')[0] || 'admin_user'),
    },
    defaults: {
      ...(profile.defaults as AnyRecord),
      websiteUrl: providerAnswers.websiteUrl,
      smsPhoneE164: providerAnswers.smsPhoneE164,
      callPhoneE164: providerAnswers.callPhoneE164,
      adminPhoneE164: providerAnswers.adminPhoneE164,
      allowedEmails,
    },
  };
}

function updateProviderDefaults(profile: AnyRecord, providerAnswers: ProviderAnswers): AnyRecord {
  const allowedEmails = splitAllowedEmails(providerAnswers.allowedEmailsCsv);
  const primaryAdminEmail = firstAllowedEmail(allowedEmails);

  return {
    ...profile,
    operations: {
      ...(profile.operations as AnyRecord),
      adminActorId: normalizeActorId(primaryAdminEmail.split('@')[0] || 'admin_user'),
    },
    defaults: {
      ...(profile.defaults as AnyRecord),
      websiteUrl: providerAnswers.websiteUrl,
      smsPhoneE164: providerAnswers.smsPhoneE164,
      callPhoneE164: providerAnswers.callPhoneE164,
      adminPhoneE164: providerAnswers.adminPhoneE164,
      allowedEmails,
    },
  };
}

function applyProviderEnvUpdates(content: string, providerAnswers: ProviderAnswers): string {
  const allowedEmails = splitAllowedEmails(providerAnswers.allowedEmailsCsv);
  const normalizedAllowedEmails =
    allowedEmails.length > 0 ? allowedEmails.join(',') : 'owner@example.com';

  const envUpdates: Array<[string, string]> = [
    ['PAYMENT_PROVIDER', providerAnswers.paymentProvider],
    ['ALLOWED_EMAILS', normalizedAllowedEmails],
    ['TWILIO_PHONE_NUMBER', providerAnswers.smsPhoneE164],
    ['BUSINESS_PHONE_NUMBER', providerAnswers.callPhoneE164],
    ['ADMIN_PHONE_NUMBER', providerAnswers.adminPhoneE164],
    ['SQUARE_ENVIRONMENT', providerAnswers.squareEnvironment],
    ['CRON_SECRET', providerAnswers.cronSecret],
  ];

  if (providerAnswers.websiteUrl) {
    envUpdates.push(['NEXT_PUBLIC_SITE_URL', providerAnswers.websiteUrl]);
    if (providerAnswers.paymentProvider === 'square') {
      envUpdates.push([
        'SQUARE_WEBHOOK_NOTIFICATION_URL',
        `${providerAnswers.websiteUrl}/api/webhooks/square`,
      ]);
    }
  }

  if (providerAnswers.supabaseUrl) {
    envUpdates.push(['NEXT_PUBLIC_SUPABASE_URL', providerAnswers.supabaseUrl]);
  }
  if (providerAnswers.supabaseAnonKey) {
    envUpdates.push(['NEXT_PUBLIC_SUPABASE_ANON_KEY', providerAnswers.supabaseAnonKey]);
  }
  if (providerAnswers.supabaseServiceRoleKey) {
    envUpdates.push(['SUPABASE_SERVICE_ROLE_KEY', providerAnswers.supabaseServiceRoleKey]);
  }
  if (providerAnswers.twilioAccountSid) {
    envUpdates.push(['TWILIO_ACCOUNT_SID', providerAnswers.twilioAccountSid]);
  }
  if (providerAnswers.twilioAuthToken) {
    envUpdates.push(['TWILIO_AUTH_TOKEN', providerAnswers.twilioAuthToken]);
  }
  if (providerAnswers.squareAccessToken) {
    envUpdates.push(['SQUARE_ACCESS_TOKEN', providerAnswers.squareAccessToken]);
  }
  if (providerAnswers.squareLocationId) {
    envUpdates.push(['SQUARE_LOCATION_ID', providerAnswers.squareLocationId]);
  }
  if (providerAnswers.squareWebhookSignatureKey) {
    envUpdates.push([
      'SQUARE_WEBHOOK_SIGNATURE_KEY',
      providerAnswers.squareWebhookSignatureKey,
    ]);
  }

  let next = content;
  for (const [key, value] of envUpdates) {
    next = upsertEnvVar(next, key, value);
  }

  return next;
}

async function runWizard(): Promise<void> {
  const profile = readProfile();
  ensureEnvLocalExists();

  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envMap = readEnvMap(envContent);
  const defaults = (profile.defaults as AnyRecord) || {};
  const defaultAllowedFromProfile = Array.isArray(defaults.allowedEmails)
    ? (defaults.allowedEmails as unknown[])
      .map((value) => String(value).trim().toLowerCase())
      .filter((value) => value.length > 0)
      .join(',')
    : '';

  const generatedCronSecret = randomBytes(24).toString('hex');
  const providerDefaults: ProviderAnswers = {
    paymentProvider: resolvePaymentProvider({
      paymentProvider: envDefault(envMap, 'PAYMENT_PROVIDER', ''),
      squareAccessToken: envMap.get('SQUARE_ACCESS_TOKEN'),
      squareLocationId: envMap.get('SQUARE_LOCATION_ID'),
      squareWebhookSignatureKey: envMap.get('SQUARE_WEBHOOK_SIGNATURE_KEY'),
    }),
    websiteUrl: normalizeUrl(
      envDefault(
        envMap,
        'NEXT_PUBLIC_SITE_URL',
        String(defaults.websiteUrl || 'https://example.com')
      )
    ),
    allowedEmailsCsv: envDefault(
      envMap,
      'ALLOWED_EMAILS',
      defaultAllowedFromProfile || 'owner@example.com'
    ),
    smsPhoneE164: normalizePhoneToE164(
      envDefault(
        envMap,
        'TWILIO_PHONE_NUMBER',
        String(defaults.smsPhoneE164 || '+15551234567')
      )
    ),
    callPhoneE164: normalizePhoneToE164(
      envDefault(
        envMap,
        'BUSINESS_PHONE_NUMBER',
        String(defaults.callPhoneE164 || defaults.smsPhoneE164 || '+15551234567')
      )
    ),
    adminPhoneE164: normalizePhoneToE164(
      envDefault(
        envMap,
        'ADMIN_PHONE_NUMBER',
        String(
          defaults.adminPhoneE164 ||
            defaults.callPhoneE164 ||
            defaults.smsPhoneE164 ||
            '+15551234567'
        )
      )
    ),
    supabaseUrl: normalizeUrl(envDefault(envMap, 'NEXT_PUBLIC_SUPABASE_URL', '')),
    supabaseAnonKey: envDefault(envMap, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
    supabaseServiceRoleKey: envDefault(envMap, 'SUPABASE_SERVICE_ROLE_KEY', ''),
    twilioAccountSid: envDefault(envMap, 'TWILIO_ACCOUNT_SID', ''),
    twilioAuthToken: envDefault(envMap, 'TWILIO_AUTH_TOKEN', ''),
    squareAccessToken: envDefault(envMap, 'SQUARE_ACCESS_TOKEN', ''),
    squareLocationId: envDefault(envMap, 'SQUARE_LOCATION_ID', ''),
    squareWebhookSignatureKey: envDefault(envMap, 'SQUARE_WEBHOOK_SIGNATURE_KEY', ''),
    squareEnvironment:
      envDefault(envMap, 'SQUARE_ENVIRONMENT', 'production').toLowerCase() === 'sandbox'
        ? 'sandbox'
        : 'production',
    cronSecret: envDefault(envMap, 'CRON_SECRET', generatedCronSecret),
  };

  const requestedMode = parseModeFromArgs(process.argv.slice(2));
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('\n==============================================');
    console.log('MainLine Setup Wizard');
    console.log('==============================================\n');
    console.log('What this software does:');
    console.log('- Stores customers, quotes, invoices, and messages in one dashboard.');
    console.log('- Lets you text customers from your business number (Twilio).');
    console.log('- Can optionally let customers pay invoices by link (Square).');
    console.log('- Gives you one place to track who needs follow-up.\n');

    const mode = requestedMode || (await promptMode(rl));
    if (mode === 'doctor') {
      console.log('\nProject Doctor mode selected.');
      console.log('This mode updates provider/API settings and regenerates the status report.\n');
    } else {
      console.log('\nFull Setup mode selected.');
      console.log('This mode updates business profile details and provider/API settings.\n');
    }

    let updatedProfile: AnyRecord = profile;
    if (mode === 'full') {
      const profileAnswers = await collectProfileAnswers(rl, profile);
      const providerAnswers = await collectProviderAnswers(rl, providerDefaults);
      updatedProfile = updateFullProfile(profile, profileAnswers, providerAnswers);

      fs.writeFileSync(profilePath, `${JSON.stringify(updatedProfile, null, 2)}\n`, 'utf8');

      const existingEnv = fs.readFileSync(envLocalPath, 'utf8');
      const nextEnv = applyProviderEnvUpdates(existingEnv, providerAnswers);
      fs.writeFileSync(envLocalPath, nextEnv, 'utf8');

      const nextEnvMap = readEnvMap(nextEnv);
      writeOnboardingStatus(providerAnswers.websiteUrl, nextEnvMap);
    } else {
      const providerAnswers = await collectProviderAnswers(rl, providerDefaults);
      updatedProfile = updateProviderDefaults(profile, providerAnswers);
      fs.writeFileSync(profilePath, `${JSON.stringify(updatedProfile, null, 2)}\n`, 'utf8');

      const existingEnv = fs.readFileSync(envLocalPath, 'utf8');
      const nextEnv = applyProviderEnvUpdates(existingEnv, providerAnswers);
      fs.writeFileSync(envLocalPath, nextEnv, 'utf8');

      const nextEnvMap = readEnvMap(nextEnv);
      writeOnboardingStatus(providerAnswers.websiteUrl, nextEnvMap);
    }

    console.log(`\n${mode === 'doctor' ? 'Project Doctor complete.' : 'Setup wizard complete.'}`);
    console.log(`- Updated profile: ${path.relative(repoRoot, profilePath)}`);
    console.log(`- Updated env vars: ${path.relative(repoRoot, envLocalPath)}`);
    console.log(`- Wrote status guide: ${path.relative(repoRoot, onboardingReportPath)}`);
    console.log('\nNext:');
    console.log('1. Open docs/onboarding-status.md');
    console.log('2. Finish TODO items in external dashboards');
    console.log('3. Run: npm run dev');
  } finally {
    rl.close();
  }
}

runWizard().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`\nSetup wizard failed: ${message}`);
  process.exit(1);
});
