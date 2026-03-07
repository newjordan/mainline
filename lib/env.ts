import { z } from 'zod';
import { isDemoModeEnabled } from '@/lib/demo-mode';

// =============================================================================
// Environment Variable Validation
// =============================================================================
// This module validates required environment variables and provides typed access.
// Core vars (Supabase) are validated at startup - app won't start without them.
// Integration vars are validated when the integration is first used.
// =============================================================================

// -----------------------------------------------------------------------------
// Schema Definitions
// -----------------------------------------------------------------------------

// Public variables (safe for client-side validation)
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Required'),
  NEXT_PUBLIC_SITE_URL: z.string().trim().url('Must be a valid URL'),
});

// Server-only variables (only validate on server)
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Required'),
});

// Core variables for server-side validation
const coreEnvSchema = publicEnvSchema.merge(serverEnvSchema);

// Twilio integration (validated when SMS features are used)
const twilioSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'Must start with AC'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Required'),
  TWILIO_PHONE_NUMBER: z
    .string()
    .regex(/^\+\d{10,15}$/, 'Must be E.164 format (e.g., +15551234567)'),
});

// Square integration (validated when payment features are used)
const squareSchema = z.object({
  SQUARE_ACCESS_TOKEN: z.string().min(1, 'Required'),
  SQUARE_LOCATION_ID: z.string().min(1, 'Required'),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1, 'Required'),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional(),
  SQUARE_WEBHOOK_NOTIFICATION_URL: z.string().trim().url('Must be a valid URL').optional(),
});

// Google Docs integration (validated when document features are used)
const googleDocsSchema = z.object({
  GOOGLE_CLIENT_EMAIL: z.string().email('Must be a valid email'),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .includes('PRIVATE KEY', 'Must contain PRIVATE KEY'),
});

// Combined schema for full validation
const fullEnvSchema = coreEnvSchema
  .merge(twilioSchema)
  .merge(squareSchema)
  .merge(googleDocsSchema);

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type CoreEnv = z.infer<typeof coreEnvSchema>;
export type FullEnv = z.infer<typeof fullEnvSchema>;

// -----------------------------------------------------------------------------
// Validation Functions
// -----------------------------------------------------------------------------

/**
 * Formats Zod errors into readable error messages
 */
function formatErrors(errors: z.ZodError): string {
  return errors.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
}

/**
 * Validates core environment variables required for app startup.
 * Throws with detailed error if validation fails.
 */
function validateCoreEnv(): CoreEnv {
  const parsed = coreEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('\n❌ Missing core environment variables:\n');
    console.error(formatErrors(parsed.error));
    console.error('\nPlease check your .env.local file.\n');
    throw new Error('Missing core environment variables - cannot start app');
  }

  return parsed.data;
}

/**
 * Validates all environment variables (core + integrations).
 * Use this when you need access to integration credentials.
 */
export function validateFullEnv(): FullEnv {
  const parsed = fullEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('\n❌ Invalid environment variables:\n');
    console.error(formatErrors(parsed.error));
    console.error('\nPlease check your .env.local file.\n');
    throw new Error('Missing or invalid environment variables');
  }

  return parsed.data;
}

/**
 * Validates Twilio credentials. Call before using Twilio features.
 */
export function validateTwilioEnv(): z.infer<typeof twilioSchema> {
  const parsed = twilioSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('\n❌ Invalid Twilio environment variables:\n');
    console.error(formatErrors(parsed.error));
    throw new Error('Missing or invalid Twilio configuration');
  }

  return parsed.data;
}

/**
 * Validates Square credentials. Call before using payment features.
 */
export function validateSquareEnv(): z.infer<typeof squareSchema> {
  const parsed = squareSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('\n❌ Invalid Square environment variables:\n');
    console.error(formatErrors(parsed.error));
    throw new Error('Missing or invalid Square configuration');
  }

  return parsed.data;
}

/**
 * Validates Google Docs credentials. Call before using document features.
 */
export function validateGoogleDocsEnv(): z.infer<typeof googleDocsSchema> {
  const parsed = googleDocsSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('\n❌ Invalid Google Docs environment variables:\n');
    console.error(formatErrors(parsed.error));
    throw new Error('Missing or invalid Google Docs configuration');
  }

  return parsed.data;
}

// -----------------------------------------------------------------------------
// Core Environment (validated at import)
// -----------------------------------------------------------------------------

// Check if we're on client or server
const isServer = typeof window === 'undefined';
const isDemoMode = isDemoModeEnabled();
const DEMO_ENV_FALLBACK: CoreEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://demo.local',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo-anon-key',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  SUPABASE_SERVICE_ROLE_KEY: 'demo-service-role-key',
};

// Only validate server env vars on server side
// Client side only validates public vars
function validateEnvAtStartup() {
  if (isDemoMode) {
    return {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || DEMO_ENV_FALLBACK.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEMO_ENV_FALLBACK.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL:
        process.env.NEXT_PUBLIC_SITE_URL || DEMO_ENV_FALLBACK.NEXT_PUBLIC_SITE_URL,
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || DEMO_ENV_FALLBACK.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  if (isServer) {
    // Server: validate all core vars including service role
    return validateCoreEnv();
  } else {
    // Client: only validate public vars
    const parsed = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    });

    if (!parsed.success) {
      console.error('\n❌ Missing public environment variables:\n');
      console.error(formatErrors(parsed.error));
      throw new Error('Missing public environment variables');
    }

    // Return with undefined service role (client can't access it)
    return {
      ...parsed.data,
      SUPABASE_SERVICE_ROLE_KEY: undefined as unknown as string,
    };
  }
}

// Validate env vars at module load time
export const env = validateEnvAtStartup();

// Service role is only available on server
export const hasServiceRole = isServer;

// Re-export hasEnvVars for compatibility with starter template components
export const hasEnvVars =
  isDemoMode ||
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !!process.env.NEXT_PUBLIC_SITE_URL;
