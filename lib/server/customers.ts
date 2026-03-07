import 'server-only';

import type { ActionResult } from '@/types';
import type { Customer, ConversationStage } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function maskPhone(phone: string): string {
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

async function getCustomerByPhoneInternal(
  phoneNumber: string
): Promise<ActionResult<Customer | null>> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Customers] getCustomerByPhone error:', error);
      return { success: false, error: 'Failed to fetch customer' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Customers] getCustomerByPhone exception:', error);
    return { success: false, error: 'Failed to fetch customer' };
  }
}

/**
 * Server-only: fetch customer by ID (no dashboard session required).
 */
export async function getCustomer(id: string): Promise<ActionResult<Customer | null>> {
  if (!isValidUUID(id)) {
    return { success: true, data: null };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Customers] getCustomer error:', error);
      return { success: false, error: 'Failed to fetch customer' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Customers] getCustomer exception:', error);
    return { success: false, error: 'Failed to fetch customer' };
  }
}

/**
 * Server-only: find or create customer by phone.
 * Used by webhooks/background tasks.
 */
export async function findOrCreateCustomer(
  phoneNumber: string
): Promise<ActionResult<{ customer: Customer; isNew: boolean }>> {
  try {
    const existingResult = await getCustomerByPhoneInternal(phoneNumber);

    if (!existingResult.success) {
      return { success: false, error: existingResult.error };
    }

    if (existingResult.data) {
      return {
        success: true,
        data: { customer: existingResult.data, isNew: false },
      };
    }

    const supabase = createServiceRoleClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ phone_number: phoneNumber })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(
          `[Customers] Race condition detected for ${maskPhone(phoneNumber)}, retrying lookup`
        );
        const retryResult = await getCustomerByPhoneInternal(phoneNumber);
        if (retryResult.success && retryResult.data) {
          return {
            success: true,
            data: { customer: retryResult.data, isNew: false },
          };
        }
      }
      console.error('[Customers] findOrCreateCustomer create error:', error);
      return { success: false, error: 'Failed to create customer' };
    }

    console.log(`[Customers] Created customer: ${customer.id} (${maskPhone(phoneNumber)})`);
    return {
      success: true,
      data: { customer, isNew: true },
    };
  } catch (error) {
    console.error('[Customers] findOrCreateCustomer exception:', error);
    return { success: false, error: 'Failed to find or create customer' };
  }
}

export async function updateSmsConsent(
  id: string,
  consent: boolean
): Promise<ActionResult<Customer>> {
  try {
    const supabase = createServiceRoleClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        sms_consent: consent,
        sms_consent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Customers] updateSmsConsent error:', error);
      return { success: false, error: 'Failed to update SMS consent' };
    }

    console.log(`[Customers] SMS consent ${consent ? 'granted' : 'revoked'} for ${customer.id}`);
    return { success: true, data: customer };
  } catch (error) {
    console.error('[Customers] updateSmsConsent exception:', error);
    return { success: false, error: 'Failed to update SMS consent' };
  }
}

export async function updateConversationStage(
  id: string,
  stage: ConversationStage
): Promise<ActionResult<Customer>> {
  try {
    const supabase = createServiceRoleClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .update({ conversation_stage: stage })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Customers] updateConversationStage error:', error);
      return { success: false, error: 'Failed to update conversation stage' };
    }

    console.log(`[Customers] Stage updated to ${stage} for ${customer.id}`);
    return { success: true, data: customer };
  } catch (error) {
    console.error('[Customers] updateConversationStage exception:', error);
    return { success: false, error: 'Failed to update conversation stage' };
  }
}
