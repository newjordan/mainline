import 'server-only';

import type { ActionResult } from '@/types';
import type { Quote } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { logQuoteEvent } from '@/lib/utils/audit-log';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function getPendingQuotesForCustomer(
  customerId: string
): Promise<ActionResult<Quote[]>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: [] };
  }

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

export async function findQuoteByConfirmationCode(
  customerId: string,
  code: string
): Promise<ActionResult<Quote | null>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: null };
  }

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

export async function acceptQuoteWithAudit(
  id: string,
  actorType: 'customer' | 'admin' = 'customer',
  actorId?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<Quote>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid quote ID' };
  }

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

    if (current.status !== 'sent') {
      return { success: false, error: `Cannot accept quote with status: ${current.status}` };
    }

    if (current.superseded_at) {
      return { success: false, error: 'Cannot accept superseded quote' };
    }

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
