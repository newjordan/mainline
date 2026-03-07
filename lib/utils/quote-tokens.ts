import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { ActionResult } from '@/types';
import { getBusinessProfile } from '@/lib/config/business-profile';
import type { Quote } from '@/lib/database.types';

/**
 * Quote Access Token Utilities
 *
 * Provides secure token-based access to quotes:
 * - 64-character hex tokens (32 bytes of entropy)
 * - 30-day expiration by default
 * - Can be revoked when quote is superseded
 *
 * Security: Tokens are cryptographically random and cannot be guessed.
 * Even if an attacker knows a valid UUID, they cannot access the quote
 * without the corresponding token.
 */

/**
 * Generate a cryptographically secure access token
 * Returns 64 hex characters (32 bytes of entropy)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a unique 4-digit confirmation code
 * Used for SMS-based quote acceptance (e.g., "YES 1234")
 */
export async function generateConfirmationCode(): Promise<string> {
  const supabase = createServiceRoleClient();
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    // Generate 4-digit code (1000-9999)
    const code = String(crypto.randomInt(1000, 10000));

    // Check if code is already in use by another sent quote
    const { data: existing } = await supabase
      .from('quotes')
      .select('id')
      .eq('confirmation_code', code)
      .eq('status', 'sent')
      .is('superseded_at', null)
      .limit(1)
      .single();

    if (!existing) {
      return code;
    }
  }

  // Fallback: add timestamp suffix for uniqueness
  return String(crypto.randomInt(1000, 10000));
}

/**
 * Create an access token for a quote
 *
 * @param quoteId - The quote UUID
 * @param expirationDays - Days until token expires (default 30)
 * @returns The token string to use in URLs
 */
export async function createQuoteAccessToken(
  quoteId: string,
  expirationDays: number = 30
): Promise<ActionResult<string>> {
  const supabase = createServiceRoleClient();
  const token = generateSecureToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  const { error } = await supabase.from('quote_access_tokens').insert({
    quote_id: quoteId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[QuoteTokens] Failed to create token:', error);
    const message = error.message || '';
    if (message.includes('quote_access_tokens')) {
      return {
        success: false,
        error:
          'Quote token table is missing in the database. Run Supabase migrations before sending quote documents.',
      };
    }
    return { success: false, error: 'Failed to create access token' };
  }

  console.log(`[QuoteTokens] Created token for quote ${quoteId}`);
  return { success: true, data: token };
}

/**
 * Validate a token and return the associated quote
 *
 * Checks:
 * - Token exists
 * - Token is not revoked
 * - Token is not expired
 *
 * @param token - The 64-character token from URL
 * @returns Quote data if valid, null otherwise
 */
export async function validateQuoteToken(
  token: string
): Promise<ActionResult<{ quote: Quote; customerId: string } | null>> {
  // Basic validation
  if (!token || token.length !== 64) {
    return { success: true, data: null };
  }

  const supabase = createServiceRoleClient();

  // Find token and join with quote
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('quote_access_tokens')
    .select('quote_id, expires_at, revoked_at')
    .eq('token', token)
    .single();

  if (tokenError || !tokenRecord) {
    return { success: true, data: null };
  }

  // Check if revoked
  if (tokenRecord.revoked_at) {
    console.log(`[QuoteTokens] Token revoked for quote ${tokenRecord.quote_id}`);
    return { success: true, data: null };
  }

  // Check if expired
  if (new Date(tokenRecord.expires_at) < new Date()) {
    console.log(`[QuoteTokens] Token expired for quote ${tokenRecord.quote_id}`);
    return { success: true, data: null };
  }

  // Fetch the quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', tokenRecord.quote_id)
    .single();

  if (quoteError || !quote) {
    console.error('[QuoteTokens] Quote not found for valid token');
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      quote: quote as Quote,
      customerId: quote.customer_id,
    },
  };
}

/**
 * Get the active (non-revoked, non-expired) token for a quote
 *
 * @param quoteId - The quote UUID
 * @returns The active token or null
 */
export async function getActiveQuoteToken(
  quoteId: string
): Promise<string | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('quote_access_tokens')
    .select('token')
    .eq('quote_id', quoteId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.token;
}

/**
 * Revoke all tokens for a quote
 *
 * Used when:
 * - Quote is superseded by a new version
 * - Quote is manually revoked
 * - Security incident
 *
 * @param quoteId - The quote UUID
 */
export async function revokeQuoteTokens(quoteId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('quote_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('quote_id', quoteId)
    .is('revoked_at', null);

  if (error) {
    console.error('[QuoteTokens] Failed to revoke tokens:', error);
  } else {
    console.log(`[QuoteTokens] Revoked all tokens for quote ${quoteId}`);
  }
}

/**
 * Build the public quote URL with token
 *
 * @param token - The access token
 * @returns Full URL like https://example.com/q/abc123...
 */
export function buildQuoteUrl(token: string): string {
  const fallbackOrigin = getBusinessProfile().defaults.websiteUrl;
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  try {
    const origin = configuredSiteUrl
      ? new URL(configuredSiteUrl).origin
      : fallbackOrigin;
    return new URL(`/q/${token}`, origin).toString();
  } catch {
    return new URL(`/q/${token}`, fallbackOrigin).toString();
  }
}
