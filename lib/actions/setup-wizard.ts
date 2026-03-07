'use server';

import { z } from 'zod';
import type { ActionResult } from '@/types';
import type { SetupWizardSavePayload, SetupWizardSnapshot } from '@/lib/setup-wizard/types';
import {
  isSetupWizardWebEnabled,
  SETUP_WIZARD_PRODUCTION_DISABLED_ERROR,
} from '@/lib/setup-wizard/web-access';
import {
  getSetupWizardSnapshot,
  saveSetupWizardConfiguration,
} from '@/lib/setup-wizard/manager';

const profileSchema = z.object({
  companyName: z.string().trim().min(1),
  companyShortName: z.string().trim().min(1),
  ownerDisplayName: z.string().trim().min(1),
  industryDescription: z.string().trim().min(1),
  serviceAreaLabel: z.string().trim().min(1),
  serviceAreaCity: z.string().trim().min(1),
  serviceAreaRegion: z.string().trim().min(1),
  serviceAreaCountry: z.string().trim().min(2).max(3),
  tagline: z.string().trim().min(1),
});

const providerSchema = z.object({
  paymentProvider: z.enum(['square', 'none']),
  websiteUrl: z.string().trim().min(1),
  allowedEmailsCsv: z.string().trim().min(1),
  smsPhoneE164: z.string().trim().min(1),
  callPhoneE164: z.string().trim().min(1),
  adminPhoneE164: z.string().trim().min(1),
  supabaseUrl: z.string().trim().optional().default(''),
  supabaseAnonKey: z.string().optional().default(''),
  supabaseServiceRoleKey: z.string().optional().default(''),
  twilioAccountSid: z.string().optional().default(''),
  twilioAuthToken: z.string().optional().default(''),
  squareAccessToken: z.string().optional().default(''),
  squareLocationId: z.string().optional().default(''),
  squareWebhookSignatureKey: z.string().optional().default(''),
  squareEnvironment: z.enum(['sandbox', 'production']),
  cronSecret: z.string().optional().default(''),
});

const saveSchema = z.object({
  mode: z.enum(['full', 'doctor']),
  profile: profileSchema,
  providers: providerSchema,
});

export async function loadSetupWizardSnapshot(): Promise<ActionResult<SetupWizardSnapshot>> {
  if (!isSetupWizardWebEnabled()) {
    return { success: false, error: SETUP_WIZARD_PRODUCTION_DISABLED_ERROR };
  }

  try {
    const snapshot = getSetupWizardSnapshot();
    return { success: true, data: snapshot };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load setup wizard';
    return { success: false, error: message };
  }
}

export async function saveSetupWizardAction(
  payload: SetupWizardSavePayload
): Promise<ActionResult<SetupWizardSnapshot>> {
  if (!isSetupWizardWebEnabled()) {
    return { success: false, error: SETUP_WIZARD_PRODUCTION_DISABLED_ERROR };
  }

  const parsed = saveSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid setup form values. Check required fields and try again.' };
  }

  try {
    const snapshot = saveSetupWizardConfiguration(parsed.data);
    return { success: true, data: snapshot };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save setup values';
    return { success: false, error: message };
  }
}
