import type { PaymentProvider } from '@/lib/payments/provider';

export type WizardMode = 'full' | 'doctor';

export interface SetupWizardProfileFields {
  companyName: string;
  companyShortName: string;
  ownerDisplayName: string;
  industryDescription: string;
  serviceAreaLabel: string;
  serviceAreaCity: string;
  serviceAreaRegion: string;
  serviceAreaCountry: string;
  tagline: string;
}

export interface SetupWizardProviderFields {
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
}

export interface SetupWizardSecretStatus {
  supabaseAnonKeySaved: boolean;
  supabaseServiceRoleKeySaved: boolean;
  twilioAccountSidSaved: boolean;
  twilioAuthTokenSaved: boolean;
  squareAccessTokenSaved: boolean;
  squareLocationIdSaved: boolean;
  squareWebhookSignatureKeySaved: boolean;
  cronSecretSaved: boolean;
}

export interface SetupWizardCheckItem {
  group: 'Core App' | 'Twilio SMS' | 'Payments';
  label: string;
  key: string;
  ready: boolean;
}

export interface SetupWizardSnapshot {
  editable: boolean;
  editableReason: string;
  profile: SetupWizardProfileFields;
  providers: SetupWizardProviderFields;
  secretStatus: SetupWizardSecretStatus;
  checks: SetupWizardCheckItem[];
  onboardingStatusPath: string;
  updatedAtIso: string;
}

export interface SetupWizardSavePayload {
  mode: WizardMode;
  profile: SetupWizardProfileFields;
  providers: SetupWizardProviderFields;
}
