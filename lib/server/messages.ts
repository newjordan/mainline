import 'server-only';

import type { ActionResult } from '@/types';
import type { Message, MessageInsert } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Server-only helpers for webhooks/background jobs.
 *
 * IMPORTANT: Do not add `'use server'` here. These are NOT server actions.
 */

export async function createMessage(
  data: MessageInsert
): Promise<ActionResult<Message>> {
  try {
    const supabase = createServiceRoleClient();
    const { data: message, error } = await supabase
      .from('messages')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('[Messages] createMessage error:', error);
      return { success: false, error: 'Failed to create message' };
    }

    console.log(
      `[Messages] Created ${data.direction} message: ${message.id} for customer ${data.customer_id}`
    );
    return { success: true, data: message };
  } catch (error) {
    console.error('[Messages] createMessage exception:', error);
    return { success: false, error: 'Failed to create message' };
  }
}

export async function updateMessageStatus(
  twilioSid: string,
  status: Message['status']
): Promise<ActionResult<Message>> {
  try {
    const supabase = createServiceRoleClient();
    const { data: message, error } = await supabase
      .from('messages')
      .update({ status })
      .eq('twilio_sid', twilioSid)
      .select()
      .single();

    if (error) {
      console.error('[Messages] updateMessageStatus error:', error);
      return { success: false, error: 'Failed to update message status' };
    }

    console.log(`[Messages] Updated status for ${twilioSid}: ${status}`);
    return { success: true, data: message };
  } catch (error) {
    console.error('[Messages] updateMessageStatus exception:', error);
    return { success: false, error: 'Failed to update message status' };
  }
}
