import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Check if a webhook event has already been processed
 * Uses service role client because webhook_events has no authenticated RLS policy
 *
 * @param provider - Webhook provider (e.g., 'twilio', 'square')
 * @param eventId - Unique event ID from provider (e.g., MessageSid, evt_xxx)
 * @returns true if already processed, false if new
 */
export async function checkWebhookProcessed(
  provider: string,
  eventId: string
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('provider', provider)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - event not processed yet
        return false;
      }
      console.error('[Webhook] checkWebhookProcessed error:', error);
      // On error, assume not processed to allow retry
      return false;
    }

    // Event exists - already processed
    return !!data;
  } catch (error) {
    console.error('[Webhook] checkWebhookProcessed exception:', error);
    return false;
  }
}

/**
 * Mark a webhook event as processed
 * Uses service role client because webhook_events has no authenticated RLS policy
 *
 * @param provider - Webhook provider (e.g., 'twilio', 'square')
 * @param eventId - Unique event ID from provider
 * @param eventType - Type of event (e.g., 'message.received', 'payment.completed')
 */
export async function markWebhookProcessed(
  provider: string,
  eventId: string,
  eventType: string
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('webhook_events').insert({
      provider,
      event_id: eventId,
      event_type: eventType,
    });

    if (error) {
      // Unique constraint violation means already processed
      if (error.code === '23505') {
        console.log(`[Webhook] Event already marked: ${provider}/${eventId}`);
        return false;
      }
      console.error('[Webhook] markWebhookProcessed error:', error);
      throw error;
    }

    console.log(`[Webhook] Marked processed: ${provider}/${eventId} (${eventType})`);
    return true;
  } catch (error) {
    console.error('[Webhook] markWebhookProcessed exception:', error);
    throw error;
  }
}

/**
 * Removes a webhook processed marker.
 * Useful when a handler claimed an event but must return a retryable error.
 */
export async function unmarkWebhookProcessed(
  provider: string,
  eventId: string
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('webhook_events')
      .delete()
      .eq('provider', provider)
      .eq('event_id', eventId);

    if (error) {
      console.error('[Webhook] unmarkWebhookProcessed error:', error);
      throw error;
    }

    console.log(`[Webhook] Unmarked processed: ${provider}/${eventId}`);
  } catch (error) {
    console.error('[Webhook] unmarkWebhookProcessed exception:', error);
    throw error;
  }
}
