'use server';

import type { ActionResult } from '@/types';
import type { Customer, CustomerInsert, ConversationStage } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';
import { customerSchema, type CustomerInput } from '@/lib/schemas/customer';

/**
 * Mask phone number for logging (shows last 4 digits only)
 * +15551234567 -> ***-***-4567
 */
function maskPhone(phone: string): string {
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

/**
 * Validate UUID format to prevent invalid database queries
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Normalize address arrays from form input.
 * - trim whitespace
 * - drop empty values
 * - de-duplicate (case-insensitive)
 */
function normalizeAdditionalAddresses(
  addresses?: string[] | null
): string[] {
  if (!Array.isArray(addresses)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of addresses) {
    const value = raw.trim();
    if (!value) continue;

    const dedupeKey = value.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    normalized.push(value);
  }

  return normalized;
}

/**
 * Get all customers (for dashboard list view)
 * Uses service role to bypass RLS for admin operations
 */
export async function getCustomers(): Promise<ActionResult<Customer[]>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Customers] getCustomers error:', error);
      return { success: false, error: 'Failed to fetch customers' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Customers] getCustomers exception:', error);
    return { success: false, error: 'Failed to fetch customers' };
  }
}

/**
 * Get a customer by ID
 */
export async function getCustomer(
  id: string
): Promise<ActionResult<Customer | null>> {
  // Validate UUID format to avoid unnecessary DB queries
  if (!isValidUUID(id)) {
    return { success: true, data: null };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
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
 * Internal helper: look up customer by phone without auth.
 * Used by webhook-called functions (findOrCreateCustomer) and auth-guarded exports.
 */
async function _getCustomerByPhoneInternal(
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
 * Get a customer by phone number (E.164 format)
 * Dashboard-facing: requires authenticated session.
 */
export async function getCustomerByPhone(
  phoneNumber: string
): Promise<ActionResult<Customer | null>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  return _getCustomerByPhoneInternal(phoneNumber);
}

/**
 * Create a new customer record
 */
export async function createCustomer(
  data: CustomerInsert
): Promise<ActionResult<Customer>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('[Customers] createCustomer error:', error);
      return { success: false, error: 'Failed to create customer' };
    }

    console.log(`[Customers] Created customer: ${customer.id} (${maskPhone(data.phone_number)})`);
    return { success: true, data: customer };
  } catch (error) {
    console.error('[Customers] createCustomer exception:', error);
    return { success: false, error: 'Failed to create customer' };
  }
}

/**
 * Allowed fields for customer updates (excludes identity/system fields)
 */
export type CustomerUpdate = {
  email?: string | null;
  name?: string | null;
  address?: string | null;
  additional_addresses?: string[];
  unit_info?: string | null;
};

/**
 * Update an existing customer record
 * Only allows updating profile fields (not phone_number)
 */
export async function updateCustomer(
  id: string,
  data: CustomerUpdate
): Promise<ActionResult<Customer>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const sanitizedData: CustomerUpdate = { ...data };
    if (sanitizedData.email !== undefined) {
      sanitizedData.email = sanitizedData.email
        ? sanitizedData.email.trim().toLowerCase()
        : null;
    }
    if (sanitizedData.additional_addresses) {
      sanitizedData.additional_addresses = normalizeAdditionalAddresses(
        sanitizedData.additional_addresses
      );
    }

    const supabase = createServiceRoleClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Customers] updateCustomer error:', error);
      return { success: false, error: 'Failed to update customer' };
    }

    return { success: true, data: customer };
  } catch (error) {
    console.error('[Customers] updateCustomer exception:', error);
    return { success: false, error: 'Failed to update customer' };
  }
}

/**
 * Customer with their most recent message for list view
 */
export type CustomerWithLastMessage = Customer & {
  lastMessage: {
    body: string;
    direction: 'inbound' | 'outbound';
    created_at: string;
  } | null;
  hasUnread: boolean;
  messageCount: number;
  isNew: boolean; // true if only 1 message (first contact)
};

/**
 * Get all customers with their most recent message
 * Used for the customer list view with activity preview
 */
export async function getCustomersWithLastMessage(): Promise<
  ActionResult<CustomerWithLastMessage[]>
> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    // Get all customers with their messages
    const { data: customers, error } = await supabase
      .from('customers')
      .select(
        `
        *,
        messages (
          body,
          direction,
          created_at
        )
      `
      )
      .order('created_at', { referencedTable: 'messages', ascending: false });

    if (error) {
      console.error('[Customers] getCustomersWithLastMessage error:', error);
      return { success: false, error: 'Failed to fetch customers' };
    }

    // Transform to include lastMessage, hasUnread, messageCount, isNew
    const result: CustomerWithLastMessage[] = (customers || []).map(
      (customer) => {
        const messages = customer.messages as Array<{
          body: string;
          direction: 'inbound' | 'outbound';
          created_at: string;
        }>;
        const lastMessage = messages?.[0] || null;
        const messageCount = messages?.length || 0;

        return {
          id: customer.id,
          phone_number: customer.phone_number,
          email: customer.email,
          name: customer.name,
          address: customer.address,
          additional_addresses: customer.additional_addresses,
          unit_info: customer.unit_info,
          sms_consent: customer.sms_consent,
          sms_consent_at: customer.sms_consent_at,
          conversation_stage: customer.conversation_stage,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
          lastMessage,
          hasUnread: lastMessage?.direction === 'inbound',
          messageCount,
          isNew: messageCount <= 1,
        };
      }
    );

    // Sort by most recent activity time.
    result.sort((a, b) => {
      const aDate = a.lastMessage?.created_at || a.created_at;
      const bDate = b.lastMessage?.created_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('[Customers] getCustomersWithLastMessage exception:', error);
    return { success: false, error: 'Failed to fetch customers' };
  }
}

/**
 * Find existing customer by phone or create new one
 * Returns { customer, isNew } to support auto-response logic in Story 3.3
 *
 * Handles race conditions: if two requests try to create the same customer,
 * the second will fail with unique constraint and retry the lookup.
 *
 * @param phoneNumber - Customer phone in E.164 format
 * @returns Customer record and whether it was newly created
 */
export async function findOrCreateCustomer(
  phoneNumber: string
): Promise<ActionResult<{ customer: Customer; isNew: boolean }>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<{ customer: Customer; isNew: boolean }>;

  try {
    // First, try to find existing customer (use internal helper — no auth needed for webhook context)
    const existingResult = await _getCustomerByPhoneInternal(phoneNumber);

    if (!existingResult.success) {
      return { success: false, error: existingResult.error };
    }

    if (existingResult.data) {
      // Customer exists
      return {
        success: true,
        data: { customer: existingResult.data, isNew: false },
      };
    }

    // Customer doesn't exist - try to create new one
    const supabase = createServiceRoleClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ phone_number: phoneNumber })
      .select()
      .single();

    if (error) {
      // Handle race condition: unique constraint violation means another request created it
      if (error.code === '23505') {
        console.log(`[Customers] Race condition detected for ${maskPhone(phoneNumber)}, retrying lookup`);
        // Retry the lookup - customer was created by another request
        const retryResult = await _getCustomerByPhoneInternal(phoneNumber);
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

/**
 * Update customer SMS consent status
 * Used for opt-in (START) and opt-out (STOP) handling
 *
 * @param id - Customer ID
 * @param consent - true for opt-in, false for opt-out
 */
export async function updateSmsConsent(
  id: string,
  consent: boolean
): Promise<ActionResult<Customer>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Customer>;

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

/**
 * Update customer conversation stage
 * Used by quick-reply flow to advance through intake steps
 */
export async function updateConversationStage(
  id: string,
  stage: ConversationStage
): Promise<ActionResult<Customer>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Customer>;

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


/**
 * Create a new customer manually from the dashboard
 * Validates input and checks for duplicate phone numbers
 */
export async function createCustomerManual(
  input: CustomerInput
): Promise<ActionResult<Customer>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  // Validate input with Zod schema
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError.message };
  }

  const {
    phone_number,
    email,
    name,
    address,
    additional_addresses,
    unit_info,
  } = parsed.data;

  try {
    // Check if customer already exists with this phone number
    const existing = await getCustomerByPhone(phone_number);
    if (existing.success && existing.data) {
      return {
        success: false,
        error: 'A customer with this phone number already exists',
      };
    }

    const normalizedAdditionalAddresses = normalizeAdditionalAddresses(
      additional_addresses
    );

    // Create the customer
    const supabase = createServiceRoleClient();
    const insertData: CustomerInsert = {
      phone_number,
      email: email?.trim().toLowerCase() || null,
      name: name?.trim() || null,
      address: address?.trim() || null,
      additional_addresses: normalizedAdditionalAddresses,
      unit_info: unit_info?.trim() || null,
    };

    const { data: customer, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'A customer with this phone number already exists',
        };
      }
      console.error('[Customers] createCustomerManual error:', error);
      return { success: false, error: 'Failed to create customer' };
    }

    console.log(`[Customers] Manually created customer: ${customer.id} (${maskPhone(phone_number)})`);
    return { success: true, data: customer };
  } catch (error) {
    console.error('[Customers] createCustomerManual exception:', error);
    return { success: false, error: 'Failed to create customer' };
  }
}
