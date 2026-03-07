'use server';

import type { ActionResult } from '@/types';
import type { Quote, QuoteInsert } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';
import { quoteSchema, quoteUpdateSchema, type QuoteInput } from '@/lib/schemas/quote';
import {
  createQuoteAccessToken,
  generateConfirmationCode,
  buildQuoteUrl,
  revokeQuoteTokens,
} from '@/lib/utils/quote-tokens';
import { logQuoteEvent, maskPhoneForAudit } from '@/lib/utils/audit-log';
import { formatCents } from '@/lib/utils/format-currency';
import {
  getBusinessProfile,
  interpolateBusinessText,
} from '@/lib/config/business-profile';

/**
 * Validate UUID format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

const businessProfile = getBusinessProfile();
const ADMIN_ACTOR_ID = businessProfile.operations.adminActorId;

/**
 * Get all quotes (for list view)
 */
export async function getQuotes(): Promise<ActionResult<Quote[]>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Quotes] getQuotes error:', error);
      return { success: false, error: 'Failed to fetch quotes' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Quotes] getQuotes exception:', error);
    return { success: false, error: 'Failed to fetch quotes' };
  }
}

/**
 * Get a single quote by ID
 */
export async function getQuote(id: string): Promise<ActionResult<Quote | null>> {
  if (!isValidUUID(id)) {
    return { success: true, data: null };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Quotes] getQuote error:', error);
      return { success: false, error: 'Failed to fetch quote' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Quotes] getQuote exception:', error);
    return { success: false, error: 'Failed to fetch quote' };
  }
}

/**
 * Get all quotes for a specific customer
 */
export async function getCustomerQuotes(
  customerId: string
): Promise<ActionResult<Quote[]>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: [] };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Quotes] getCustomerQuotes error:', error);
      return { success: false, error: 'Failed to fetch customer quotes' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Quotes] getCustomerQuotes exception:', error);
    return { success: false, error: 'Failed to fetch customer quotes' };
  }
}

/**
 * Get pending quote for a customer (for YES detection)
 */
export async function getPendingQuoteForCustomer(
  customerId: string
): Promise<ActionResult<Quote | null>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: null };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Quotes] getPendingQuoteForCustomer error:', error);
      return { success: false, error: 'Failed to fetch pending quote' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Quotes] getPendingQuoteForCustomer exception:', error);
    return { success: false, error: 'Failed to fetch pending quote' };
  }
}

/**
 * Create a new quote
 */
export async function createQuote(
  input: QuoteInput
): Promise<ActionResult<Quote>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  // Validate input
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  try {
    const supabase = createServiceRoleClient();

    const insertData: QuoteInsert = {
      customer_id: parsed.data.customer_id,
      description: parsed.data.description,
      service_address: parsed.data.service_address?.trim() || null,
      line_items: parsed.data.line_items,
      total_cents: parsed.data.total_cents,
      status: parsed.data.status || 'draft',
    };

    const { data, error } = await supabase
      .from('quotes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Quotes] createQuote error:', error);
      return { success: false, error: 'Failed to create quote' };
    }

    // Log audit event
    await logQuoteEvent(data.id, 'created', 'admin', ADMIN_ACTOR_ID, {
      short_ref: data.short_ref,
      total_cents: data.total_cents,
      customer_id: data.customer_id,
    });

    console.log(`[Quotes] Created quote: ${data.short_ref || data.id}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Quotes] createQuote exception:', error);
    return { success: false, error: 'Failed to create quote' };
  }
}

/**
 * Update an existing quote
 */
export async function updateQuote(
  id: string,
  data: Partial<Quote>
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  // Validate updates with Zod schema
  const validation = quoteUpdateSchema.safeParse(data);
  if (!validation.success) {
    console.error('[Quotes] updateQuote validation error:', validation.error.flatten());
    return { success: false, error: 'Invalid quote data' };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: quote, error } = await supabase
      .from('quotes')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Quotes] updateQuote error:', error);
      return { success: false, error: 'Failed to update quote' };
    }

    return { success: true, data: quote };
  } catch (error) {
    console.error('[Quotes] updateQuote exception:', error);
    return { success: false, error: 'Failed to update quote' };
  }
}

/**
 * Accept a quote (mark as accepted)
 */
export async function acceptQuote(id: string): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Quotes] acceptQuote error:', error);
      return { success: false, error: 'Failed to accept quote' };
    }

    console.log(`[Quotes] Accepted quote: ${quote.id}`);
    return { success: true, data: quote };
  } catch (error) {
    console.error('[Quotes] acceptQuote exception:', error);
    return { success: false, error: 'Failed to accept quote' };
  }
}

/**
 * Get all pending (sent, non-superseded) quotes for a customer
 * Used for YES detection when customer has multiple quotes
 */
export async function getPendingQuotesForCustomer(
  customerId: string
): Promise<ActionResult<Quote[]>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: [] };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Quote[]>;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'sent')
      .is('superseded_at', null)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Quotes] getPendingQuotesForCustomer error:', error);
      return { success: false, error: 'Failed to fetch pending quotes' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Quotes] getPendingQuotesForCustomer exception:', error);
    return { success: false, error: 'Failed to fetch pending quotes' };
  }
}

/**
 * Find a quote by confirmation code for a specific customer
 * Used for secure YES detection
 */
export async function findQuoteByConfirmationCode(
  customerId: string,
  code: string
): Promise<ActionResult<Quote | null>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: null };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Quote | null>;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('customer_id', customerId)
      .eq('confirmation_code', code)
      .eq('status', 'sent')
      .is('superseded_at', null)
      .is('archived_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Quotes] findQuoteByConfirmationCode error:', error);
      return { success: false, error: 'Failed to find quote' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Quotes] findQuoteByConfirmationCode exception:', error);
    return { success: false, error: 'Failed to find quote' };
  }
}

/**
 * Send a quote via SMS (Secure Version)
 *
 * Security features:
 * 1. Generates cryptographic access token (64-char hex)
 * 2. Generates 4-digit confirmation code for acceptance
 * 3. Token-based URL prevents enumeration attacks
 * 4. Confirmation code prevents accepting wrong quote
 * 5. Full audit logging
 *
 * Flow:
 * 1. Get quote and customer
 * 2. Generate confirmation code
 * 3. Generate access token
 * 4. Build secure SMS message
 * 5. Send SMS via Twilio
 * 6. Create message record
 * 7. Update quote status to 'sent' with confirmation code
 * 8. Log audit event
 */
export async function sendQuote(id: string): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    // 1. Get the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      console.error('[Quotes] sendQuote - quote not found:', quoteError);
      return { success: false, error: 'Quote not found' };
    }

    // Prevent sending superseded quotes
    if (quote.superseded_at) {
      return { success: false, error: 'Cannot send superseded quote' };
    }

    if (quote.archived_at) {
      return { success: false, error: 'Cannot send archived quote' };
    }

    if (quote.status !== 'draft' && quote.status !== 'sent') {
      return {
        success: false,
        error: `Cannot send quote with status: ${quote.status}`,
      };
    }

    // 2. Get the customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', quote.customer_id)
      .single();

    if (customerError || !customer) {
      console.error('[Quotes] sendQuote - customer not found:', customerError);
      return { success: false, error: 'Customer not found' };
    }

    // 3. Generate confirmation code (4 digits)
    const confirmationCode = await generateConfirmationCode();

    // 4. Generate secure access token
    const tokenResult = await createQuoteAccessToken(id);
    if (!tokenResult.success) {
      console.error('[Quotes] sendQuote - token creation failed:', tokenResult.error);
      return {
        success: false,
        error: tokenResult.error || 'Failed to generate access token',
      };
    }

    // 5. Build secure quote URL and SMS message
    const quoteUrl = buildQuoteUrl(tokenResult.data);
    const isResend = quote.status === 'sent';
    const shortRef = quote.short_ref || `Q-${quote.id.slice(0, 6).toUpperCase()}`;

    // New SMS format with short_ref and confirmation code
    const smsBody = `${interpolateBusinessText(businessProfile.sms.quotePrefix)} ${shortRef}
Total: ${formatCents(quote.total_cents)}

View: ${quoteUrl}

To accept, reply: YES ${confirmationCode}`;

    // 6. Send SMS via Twilio
    const { sendSMS } = await import('@/lib/integrations/twilio');
    const sendResult = await sendSMS(customer.phone_number, smsBody);

    if (!sendResult.success) {
      console.error('[Quotes] sendQuote - SMS failed:', sendResult.error);
      return { success: false, error: 'Failed to send SMS' };
    }

    // 7. Create message record
    await supabase.from('messages').insert({
      customer_id: customer.id,
      direction: 'outbound',
      body: smsBody,
      twilio_sid: sendResult.data,
      status: 'sent',
    });

    // 8. Update quote status to sent with confirmation code
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        confirmation_code: confirmationCode,
        google_doc_url: quoteUrl,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Quotes] sendQuote - update failed:', updateError);
      // SMS was sent, so return partial success
      return { success: true, data: { ...quote, status: 'sent' } as Quote };
    }

    // 9. Log audit event
    await logQuoteEvent(
      id,
      isResend ? 'resent' : 'sent',
      'admin',
      ADMIN_ACTOR_ID,
      {
        confirmation_code: confirmationCode,
        short_ref: shortRef,
        total_cents: quote.total_cents,
        customer_phone_masked: maskPhoneForAudit(customer.phone_number),
      }
    );

    console.log(`[Quotes] Sent quote ${shortRef} to ${maskPhoneForAudit(customer.phone_number)}`);
    return { success: true, data: updatedQuote };
  } catch (error) {
    console.error('[Quotes] sendQuote exception:', error);
    return { success: false, error: 'Failed to send quote' };
  }
}

/**
 * Update a quote with versioning support
 *
 * Immutability rules:
 * - draft: Can edit in-place
 * - sent/rejected: Creates new version (copy with parent_quote_id), marks original superseded
 * - accepted: Cannot modify (fully immutable)
 * - superseded: Cannot modify (historical record)
 *
 * When creating a new version:
 * 1. Copy quote data to new record with parent_quote_id link
 * 2. Mark original as superseded_at = now()
 * 3. Revoke all access tokens for original quote
 * 4. Log audit events for both supersede and create
 */
export async function updateQuoteWithVersioning(
  id: string,
  updates: {
    description?: string;
    service_address?: string | null;
    line_items?: { description: string; amount_cents: number }[];
    total_cents?: number;
  }
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    // 1. Get current quote
    const { data: current, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Quote not found' };
    }

    // 2. Check immutability rules
    if (current.status === 'accepted') {
      return { success: false, error: 'Cannot modify accepted quote' };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Cannot modify superseded quote' };
    }

    if (current.archived_at) {
      return { success: false, error: 'Cannot modify archived quote' };
    }

    // 3. If draft, allow in-place edit
    if (current.status === 'draft') {
      const { data: updated, error: updateError } = await supabase
        .from('quotes')
        .update({
          description: updates.description ?? current.description,
          service_address:
            updates.service_address === undefined
              ? current.service_address
              : updates.service_address,
          line_items: updates.line_items ?? current.line_items,
          total_cents: updates.total_cents ?? current.total_cents,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Quotes] updateQuoteWithVersioning draft update error:', updateError);
        return { success: false, error: 'Failed to update quote' };
      }

      console.log(`[Quotes] Updated draft quote: ${updated.short_ref}`);
      return { success: true, data: updated };
    }

    // 4. For sent/rejected quotes, create new version
    // This maintains immutability of the original quote

    // 4a. Create new quote with parent link
    const newQuoteData: QuoteInsert = {
      customer_id: current.customer_id,
      description: updates.description ?? current.description,
      service_address:
        updates.service_address === undefined
          ? current.service_address
          : updates.service_address,
      line_items: updates.line_items ?? current.line_items,
      total_cents: updates.total_cents ?? current.total_cents,
      status: 'draft', // New version starts as draft
      parent_quote_id: current.id,
    };

    const { data: newQuote, error: insertError } = await supabase
      .from('quotes')
      .insert(newQuoteData)
      .select()
      .single();

    if (insertError || !newQuote) {
      console.error('[Quotes] updateQuoteWithVersioning insert error:', insertError);
      return { success: false, error: 'Failed to create new version' };
    }

    // 4b. Mark original as superseded
    const { error: supersedeError } = await supabase
      .from('quotes')
      .update({ superseded_at: new Date().toISOString() })
      .eq('id', id);

    if (supersedeError) {
      console.error('[Quotes] updateQuoteWithVersioning supersede error:', supersedeError);
      // Continue - new quote was created successfully
    }

    // 4c. Revoke all access tokens for original quote
    await revokeQuoteTokens(id);

    // 4d. Log audit events
    await logQuoteEvent(id, 'superseded', 'admin', ADMIN_ACTOR_ID, {
      new_version_id: newQuote.id,
      new_version_short_ref: newQuote.short_ref,
    });

    await logQuoteEvent(newQuote.id, 'created', 'admin', ADMIN_ACTOR_ID, {
      parent_quote_id: current.id,
      parent_short_ref: current.short_ref,
      is_revision: true,
    });

    console.log(`[Quotes] Created version ${newQuote.short_ref} from ${current.short_ref}`);
    return { success: true, data: newQuote };
  } catch (error) {
    console.error('[Quotes] updateQuoteWithVersioning exception:', error);
    return { success: false, error: 'Failed to update quote' };
  }
}

/**
 * Get all versions in a quote chain (parent and children)
 *
 * Returns quotes in chronological order (oldest first)
 */
export async function getQuoteVersionHistory(
  quoteId: string
): Promise<ActionResult<Quote[]>> {
  if (!isValidUUID(quoteId)) {
    return { success: true, data: [] };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    // First, get the quote to understand the chain
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return { success: false, error: 'Quote not found' };
    }

    // Find the root quote (traverse up parent chain)
    let rootId = quote.id;
    let currentId = quote.parent_quote_id;

    while (currentId) {
      const { data: parent } = await supabase
        .from('quotes')
        .select('id, parent_quote_id')
        .eq('id', currentId)
        .single();

      if (!parent) break;
      rootId = parent.id;
      currentId = parent.parent_quote_id;
    }

    // Collect all quotes in the chain (including root)
    const chainIds: string[] = [rootId];
    const visited = new Set<string>([rootId]);

    // BFS to find all children
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;

      const { data: children } = await supabase
        .from('quotes')
        .select('id')
        .eq('parent_quote_id', current);

      if (children) {
        for (const child of children) {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            chainIds.push(child.id);
            queue.push(child.id);
          }
        }
      }
    }

    // Fetch all quotes in chain
    const { data: quotes, error: listError } = await supabase
      .from('quotes')
      .select('*')
      .in('id', chainIds)
      .order('created_at', { ascending: true });

    if (listError) {
      console.error('[Quotes] getQuoteVersionHistory error:', listError);
      return { success: false, error: 'Failed to fetch version history' };
    }

    return { success: true, data: quotes || [] };
  } catch (error) {
    console.error('[Quotes] getQuoteVersionHistory exception:', error);
    return { success: false, error: 'Failed to fetch version history' };
  }
}

/**
 * Get the latest active version in a quote chain
 * (non-superseded quote)
 */
export async function getLatestQuoteVersion(
  quoteId: string
): Promise<ActionResult<Quote | null>> {
  // Auth is enforced by getQuoteVersionHistory called below
  const historyResult = await getQuoteVersionHistory(quoteId);

  if (!historyResult.success) {
    return { success: false, error: historyResult.error };
  }

  // Find the latest non-superseded quote
  const activeQuote = historyResult.data
    .filter((q) => !q.superseded_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return { success: true, data: activeQuote || null };
}

/**
 * Accept a quote with audit logging
 */
export async function acceptQuoteWithAudit(
  id: string,
  actorType: 'customer' | 'admin' = 'customer',
  actorId?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Quote>;

  try {
    const supabase = createServiceRoleClient();

    // Get current quote to verify it can be accepted
    const { data: current, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Quote not found' };
    }

    // Validate quote can be accepted
    if (current.status !== 'sent') {
      return { success: false, error: `Cannot accept quote with status: ${current.status}` };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Cannot accept superseded quote' };
    }

    // Accept the quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Quotes] acceptQuote error:', error);
      return { success: false, error: 'Failed to accept quote' };
    }

    // Log audit event
    await logQuoteEvent(id, 'accepted', actorType, actorId || null, {
      short_ref: quote.short_ref,
      total_cents: quote.total_cents,
      ...metadata,
    });

    console.log(`[Quotes] Accepted quote: ${quote.short_ref}`);
    return { success: true, data: quote };
  } catch (error) {
    console.error('[Quotes] acceptQuote exception:', error);
    return { success: false, error: 'Failed to accept quote' };
  }
}


/**
 * Delete a quote record.
 *
 * Guardrails:
 * - Blocks deletion when newer revisions depend on this quote
 * - Blocks deletion when invoice linked to this quote is still active
 *   (draft/sent/overdue). Paid invoices are allowed and will retain
 *   their record with quote_id set to NULL by FK behavior.
 */
export async function deleteQuote(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, short_ref')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: 'Quote not found' };
    }

    const { count: childCount, error: childError } = await supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('parent_quote_id', id);

    if (childError) {
      console.error('[Quotes] deleteQuote child lookup error:', childError);
      return { success: false, error: 'Failed to validate quote revisions' };
    }

    if ((childCount ?? 0) > 0) {
      return {
        success: false,
        error: 'Cannot delete this quote because newer revisions exist',
      };
    }

    const { data: activeInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('quote_id', id)
      .in('status', ['draft', 'sent', 'overdue'])
      .limit(1);

    if (invoiceError) {
      console.error('[Quotes] deleteQuote invoice lookup error:', invoiceError);
      return { success: false, error: 'Failed to validate linked invoices' };
    }

    if (activeInvoices && activeInvoices.length > 0) {
      return {
        success: false,
        error: 'Cannot delete quote while linked invoice is still active',
      };
    }

    const { error: deleteError } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Quotes] deleteQuote delete error:', deleteError);
      return { success: false, error: 'Failed to delete quote' };
    }

    console.log(`[Quotes] Deleted quote: ${quote.short_ref || quote.id}`);
    return { success: true, data: { id } };
  } catch (error) {
    console.error('[Quotes] deleteQuote exception:', error);
    return { success: false, error: 'Failed to delete quote' };
  }
}

/**
 * Mark an accepted quote as completed.
 * This represents business completion (job done), not quote acceptance.
 */
export async function markQuoteCompleted(
  id: string
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    const { data: current, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Quote not found' };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Cannot complete superseded quote' };
    }

    if (current.archived_at) {
      return { success: false, error: 'Unarchive quote before marking complete' };
    }

    if (current.status !== 'accepted') {
      return { success: false, error: 'Only accepted quotes can be completed' };
    }

    const completionTime = current.completed_at ?? new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('quotes')
      .update({ completed_at: completionTime })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Quotes] markQuoteCompleted update error:', updateError);
      return { success: false, error: 'Failed to mark quote complete' };
    }

    await logQuoteEvent(id, 'updated', 'admin', ADMIN_ACTOR_ID, {
      action: 'marked_completed',
      short_ref: updated.short_ref,
      completed_at: updated.completed_at,
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Quotes] markQuoteCompleted exception:', error);
    return { success: false, error: 'Failed to mark quote complete' };
  }
}

/**
 * Remove completion marker from a quote.
 */
export async function markQuoteIncomplete(
  id: string
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    const { data: current, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Quote not found' };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Cannot update superseded quote' };
    }

    if (current.archived_at) {
      return { success: false, error: 'Unarchive quote before updating completion state' };
    }

    const { data: updated, error: updateError } = await supabase
      .from('quotes')
      .update({ completed_at: null })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Quotes] markQuoteIncomplete update error:', updateError);
      return { success: false, error: 'Failed to update completion state' };
    }

    await logQuoteEvent(id, 'updated', 'admin', ADMIN_ACTOR_ID, {
      action: 'marked_incomplete',
      short_ref: updated.short_ref,
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Quotes] markQuoteIncomplete exception:', error);
    return { success: false, error: 'Failed to update completion state' };
  }
}

/**
 * Archive a quote from active operational views.
 */
export async function archiveQuote(
  id: string
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    const { data: current, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Quote not found' };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Superseded quotes are already historical' };
    }

    if (current.status === 'sent' && !current.completed_at) {
      return {
        success: false,
        error: 'Cannot archive quote while waiting for customer response',
      };
    }

    const archivedTime = current.archived_at ?? new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('quotes')
      .update({ archived_at: archivedTime })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Quotes] archiveQuote update error:', updateError);
      return { success: false, error: 'Failed to archive quote' };
    }

    await logQuoteEvent(id, 'updated', 'admin', ADMIN_ACTOR_ID, {
      action: 'archived',
      short_ref: updated.short_ref,
      archived_at: updated.archived_at,
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Quotes] archiveQuote exception:', error);
    return { success: false, error: 'Failed to archive quote' };
  }
}

/**
 * Restore an archived quote to active operational views.
 */
export async function unarchiveQuote(
  id: string
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    const { data: current, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Quote not found' };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Cannot restore superseded quote' };
    }

    const { data: updated, error: updateError } = await supabase
      .from('quotes')
      .update({ archived_at: null })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Quotes] unarchiveQuote update error:', updateError);
      return { success: false, error: 'Failed to restore quote' };
    }

    await logQuoteEvent(id, 'updated', 'admin', ADMIN_ACTOR_ID, {
      action: 'unarchived',
      short_ref: updated.short_ref,
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Quotes] unarchiveQuote exception:', error);
    return { success: false, error: 'Failed to restore quote' };
  }
}

export type QuoteBulkLifecycleOperation =
  | 'archive'
  | 'unarchive'
  | 'mark-complete';

export interface QuoteBulkLifecycleResult {
  attempted: number;
  updated: number;
  failed: Array<{ id: string; error: string }>;
}

/**
 * Bulk lifecycle operations for quote organization workflows.
 */
export async function bulkUpdateQuotesLifecycle(
  ids: string[],
  operation: QuoteBulkLifecycleOperation
): Promise<ActionResult<QuoteBulkLifecycleResult>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  const uniqueIds = Array.from(new Set(ids)).filter(isValidUUID).slice(0, 200);

  if (uniqueIds.length === 0) {
    return { success: false, error: 'No valid quote IDs selected' };
  }

  const failed: Array<{ id: string; error: string }> = [];
  let updated = 0;

  for (const id of uniqueIds) {
    const result =
      operation === 'archive'
        ? await archiveQuote(id)
        : operation === 'unarchive'
          ? await unarchiveQuote(id)
          : await markQuoteCompleted(id);

    if (result.success) {
      updated += 1;
      continue;
    }

    failed.push({
      id,
      error: result.error || 'Operation failed',
    });
  }

  return {
    success: true,
    data: {
      attempted: uniqueIds.length,
      updated,
      failed,
    },
  };
}
