'use server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';

export type AttentionCounts = {
  unreadMessages: number;
  pendingQuotes: number;
  outstandingInvoices: number;
};

/**
 * Get counts of items needing admin attention.
 *
 * - Unread messages: Customers whose last message is inbound (customer sent, admin has not replied)
 * - Pending quotes: Quotes with status 'sent' (waiting for customer response)
 * - Outstanding invoices: Invoices with status 'sent' or 'overdue'
 */
export async function getAttentionCounts(): Promise<AttentionCounts> {
  const authResult = await requireAdminSession();
  if (!authResult.success) {
    return { unreadMessages: 0, pendingQuotes: 0, outstandingInvoices: 0 };
  }

  try {
    const supabase = createServiceRoleClient();

    // Run all queries in parallel (optimized - no N+1)
    const [messagesResult, quotesResult, invoicesResult] = await Promise.all([
      // Get all messages ordered by created_at desc to find last message per customer
      supabase
        .from('messages')
        .select('customer_id, direction, created_at')
        .order('created_at', { ascending: false }),

      // Count pending quotes
      supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .is('superseded_at', null)
        .is('archived_at', null),

      // Count outstanding invoices (sent or overdue)
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .in('status', ['sent', 'overdue']),
    ]);

    // Count customers with unread messages (their last message is inbound)
    // Build a map of customer_id -> last message direction
    const messages = messagesResult.data ?? [];
    const lastMessageByCustomer = new Map<string, string>();

    for (const msg of messages) {
      // Since messages are ordered by created_at desc, first occurrence is the latest
      if (!lastMessageByCustomer.has(msg.customer_id)) {
        lastMessageByCustomer.set(msg.customer_id, msg.direction);
      }
    }

    // Count customers whose last message is inbound (unread)
    let unreadMessages = 0;
    for (const direction of lastMessageByCustomer.values()) {
      if (direction === 'inbound') {
        unreadMessages++;
      }
    }

    return {
      unreadMessages,
      pendingQuotes: quotesResult.count ?? 0,
      outstandingInvoices: invoicesResult.count ?? 0,
    };
  } catch (error) {
    console.error('[Dashboard] getAttentionCounts error:', error);
    // Return zeros to prevent page crash
    return {
      unreadMessages: 0,
      pendingQuotes: 0,
      outstandingInvoices: 0,
    };
  }
}

/**
 * Get customers with unread messages (their last message is inbound).
 * Returns customer IDs for filtering the customer list.
 */
export async function getCustomersWithUnreadMessages(): Promise<string[]> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return [];

  const supabase = createServiceRoleClient();

  // Get all messages ordered by created_at desc (optimized - no N+1)
  const { data: messages } = await supabase
    .from('messages')
    .select('customer_id, direction')
    .order('created_at', { ascending: false });

  if (!messages) return [];

  // Build a map of customer_id -> last message direction
  const lastMessageByCustomer = new Map<string, string>();

  for (const msg of messages) {
    // Since messages are ordered by created_at desc, first occurrence is the latest
    if (!lastMessageByCustomer.has(msg.customer_id)) {
      lastMessageByCustomer.set(msg.customer_id, msg.direction);
    }
  }

  // Return customer IDs whose last message is inbound (unread)
  const unreadCustomerIds: string[] = [];
  for (const [customerId, direction] of lastMessageByCustomer.entries()) {
    if (direction === 'inbound') {
      unreadCustomerIds.push(customerId);
    }
  }

  return unreadCustomerIds;
}
