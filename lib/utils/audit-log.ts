import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type {
  QuoteAuditEventType,
  QuoteAuditActorType,
  QuoteAuditLog,
} from '@/lib/database.types';
import type { ActionResult } from '@/types';

/**
 * Quote Audit Logging Utilities
 *
 * Provides immutable audit trail for all quote operations.
 * All events are logged with:
 * - Event type (what happened)
 * - Actor type and ID (who did it)
 * - IP address and user agent (forensics)
 * - Metadata (additional context)
 *
 * This enables:
 * - Compliance and legal requirements
 * - Debugging and support
 * - Security incident investigation
 * - Business analytics
 */

/**
 * Metadata that can be attached to audit events
 */
export interface AuditMetadata {
  /** Confirmation code used for acceptance */
  confirmation_code?: string;
  /** Twilio message SID */
  message_sid?: string;
  /** New version quote ID (for superseded events) */
  new_version_id?: string;
  /** Parent quote ID (for created events on versions) */
  parent_quote_id?: string;
  /** Access token used (partial, for security) */
  token_prefix?: string;
  /** Quote short reference */
  short_ref?: string;
  /** Quote total in cents */
  total_cents?: number;
  /** Customer phone (masked) */
  customer_phone_masked?: string;
  /** Any other contextual data */
  [key: string]: unknown;
}

/**
 * Log a quote event to the audit trail
 *
 * @param quoteId - The quote UUID
 * @param eventType - What happened (created, sent, accepted, etc.)
 * @param actorType - Who did it (admin, customer, system)
 * @param actorId - Identifier for the actor (optional)
 * @param metadata - Additional context (optional)
 *
 * Note: This function never throws. Audit logging failures are
 * logged to console but don't break the main operation.
 */
export async function logQuoteEvent(
  quoteId: string,
  eventType: QuoteAuditEventType,
  actorType: QuoteAuditActorType,
  actorId: string | null = null,
  metadata: AuditMetadata = {}
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Try to get IP and user agent from request headers
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const headersList = await headers();
      // Get IP from various headers (Vercel, Cloudflare, direct)
      ipAddress =
        headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') ||
        headersList.get('cf-connecting-ip') ||
        null;
      userAgent = headersList.get('user-agent') || null;
    } catch {
      // Headers not available (e.g., in background job or cron)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('quote_audit_log') as any).insert({
      quote_id: quoteId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata,
    });

    if (error) {
      console.error('[Audit] Failed to log event:', error);
    } else {
      // Log to console as backup
      const actorInfo = actorId ? `${actorType}:${actorId}` : actorType;
      console.log(`[Audit] ${eventType} on quote ${quoteId} by ${actorInfo}`);
    }
  } catch (error) {
    // Never throw from audit logging - log to console and continue
    console.error('[Audit] Exception logging event:', error);
  }
}

/**
 * Get audit history for a quote
 *
 * @param quoteId - The quote UUID
 * @returns Array of audit log entries, newest first
 */
export async function getQuoteAuditHistory(
  quoteId: string
): Promise<ActionResult<QuoteAuditLog[]>> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('quote_audit_log')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Audit] Failed to fetch history:', error);
      return { success: false, error: 'Failed to fetch audit history' };
    }

    return { success: true, data: (data as QuoteAuditLog[]) || [] };
  } catch (error) {
    console.error('[Audit] Exception fetching history:', error);
    return { success: false, error: 'Failed to fetch audit history' };
  }
}

/**
 * Get audit history for all versions of a quote chain
 *
 * @param quoteId - Any quote ID in the version chain
 * @returns Combined audit history for all versions
 */
export async function getQuoteChainAuditHistory(
  quoteId: string
): Promise<ActionResult<QuoteAuditLog[]>> {
  try {
    const supabase = createServiceRoleClient();

    // First, find all quotes in this chain
    // Start with the given quote and traverse up/down the chain
    const quoteIds: string[] = [quoteId];

    // Get parent chain
    let currentId = quoteId;
    while (true) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('parent_quote_id')
        .eq('id', currentId)
        .single();

      if (!quote?.parent_quote_id) break;
      quoteIds.push(quote.parent_quote_id);
      currentId = quote.parent_quote_id;
    }

    // Get child chain
    currentId = quoteId;
    while (true) {
      const { data: child } = await supabase
        .from('quotes')
        .select('id')
        .eq('parent_quote_id', currentId)
        .single();

      if (!child) break;
      quoteIds.push(child.id);
      currentId = child.id;
    }

    // Get all audit logs for all quotes in chain
    const { data, error } = await supabase
      .from('quote_audit_log')
      .select('*')
      .in('quote_id', quoteIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Audit] Failed to fetch chain history:', error);
      return { success: false, error: 'Failed to fetch audit history' };
    }

    return { success: true, data: (data as QuoteAuditLog[]) || [] };
  } catch (error) {
    console.error('[Audit] Exception fetching chain history:', error);
    return { success: false, error: 'Failed to fetch audit history' };
  }
}

/**
 * Helper to mask phone number for audit logs
 * Shows only last 4 digits: +1******1234
 */
export function maskPhoneForAudit(phone: string): string {
  if (phone.length < 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}
