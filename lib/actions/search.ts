'use server';

import { createClient } from '@/lib/supabase/server';
import { extractInvoiceRefToken } from '@/lib/utils/invoice-reference';
import type { ActionResult } from '@/types';

// =============================================================================
// Global Search Action
// =============================================================================
// Searches across customers, quotes, invoices, and messages.
// Returns up to 5 results per category for performance.
// =============================================================================

// Result types for each entity
export type CustomerSearchResult = {
  id: string;
  name: string | null;
  phone_number: string;
  email: string | null;
  address: string | null;
};

export type QuoteSearchResult = {
  id: string;
  short_ref: string;
  description: string;
  total_cents: number;
  status: string;
  customer: { name: string | null; phone_number: string } | null;
};

export type InvoiceSearchResult = {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  customer: { name: string | null; phone_number: string } | null;
};

export type MessageSearchResult = {
  id: string;
  body: string;
  created_at: string;
  customer_id: string;
  customer: { name: string | null; phone_number: string } | null;
};

export type SearchResults = {
  customers: CustomerSearchResult[];
  quotes: QuoteSearchResult[];
  invoices: InvoiceSearchResult[];
  messages: MessageSearchResult[];
};

const RESULTS_LIMIT = 5;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Global search across all entities
 *
 * @param query - Search string (minimum 2 characters)
 * @returns Search results grouped by entity type
 */
export async function globalSearch(
  query: string
): Promise<ActionResult<SearchResults>> {
  // Require minimum 2 characters
  if (!query || query.trim().length < 2) {
    return {
      success: true,
      data: { customers: [], quotes: [], invoices: [], messages: [] },
    };
  }

  const supabase = await createClient();
  const searchTerm = query.trim();
  
  // Sanitize PostgREST filter syntax special characters to prevent injection
  // Strip: , . ( ) : which have meaning in PostgREST filter strings
  const sanitizedTerm = searchTerm.replace(/[,.:()]/g, '');
  
  // Escape LIKE/ILIKE special characters to prevent pattern injection
  const escapedTerm = sanitizedTerm
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  const searchPattern = `%${escapedTerm}%`;
  const invoiceRefToken = extractInvoiceRefToken(searchTerm);

  try {
    // Run all searches in parallel for performance
    const [customersResult, quotesResult, messagesResult] = await Promise.all([
      // 1. Customers: search name, phone, email, address
      supabase
        .from('customers')
        .select('id, name, phone_number, email, address')
        .or(
          `name.ilike.${searchPattern},phone_number.ilike.${searchPattern},email.ilike.${searchPattern},address.ilike.${searchPattern}`
        )
        .order('updated_at', { ascending: false })
        .limit(RESULTS_LIMIT),

      // 2. Quotes: search description, short_ref
      supabase
        .from('quotes')
        .select(
          'id, short_ref, description, total_cents, status, customers(name, phone_number)'
        )
        .or(`description.ilike.${searchPattern},short_ref.ilike.${searchPattern}`)
        .is('superseded_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(RESULTS_LIMIT),

      // 3. Messages: search body content
      supabase
        .from('messages')
        .select('id, body, created_at, customer_id, customers(name, phone_number)')
        .ilike('body', searchPattern)
        .order('created_at', { ascending: false })
        .limit(RESULTS_LIMIT),
    ]);

    // Get matching customer IDs for invoice search
    const matchingCustomerIds =
      customersResult.data?.map((c) => c.id) ?? [];

    // 4. Invoices: search by matching customers (if any found)
    // Type for raw invoice data from Supabase
    type RawInvoice = {
      id: string;
      amount_cents: number;
      status: string;
      created_at: string;
      customers: { name: string | null; phone_number: string } | null;
    };

    const invoiceMap = new Map<string, RawInvoice>();

    if (matchingCustomerIds.length > 0) {
      const result = await supabase
        .from('invoices')
        .select('id, amount_cents, status, created_at, customers(name, phone_number)')
        .in('customer_id', matchingCustomerIds)
        .order('created_at', { ascending: false })
        .limit(RESULTS_LIMIT);

      for (const invoice of ((result.data ?? []) as unknown as RawInvoice[])) {
        invoiceMap.set(invoice.id, invoice);
      }
    }

    const invoiceOrClauses = [`id.ilike.${searchPattern}`];
    if (invoiceRefToken) {
      invoiceOrClauses.push(`id.ilike.%${invoiceRefToken}%`);
    }
    if (UUID_REGEX.test(searchTerm)) {
      invoiceOrClauses.push(`id.eq.${searchTerm.toLowerCase()}`);
    }

    const idMatchedInvoicesResult = await supabase
      .from('invoices')
      .select('id, amount_cents, status, created_at, customers(name, phone_number)')
      .or(invoiceOrClauses.join(','))
      .order('created_at', { ascending: false })
      .limit(RESULTS_LIMIT);

    for (const invoice of ((idMatchedInvoicesResult.data ?? []) as unknown as RawInvoice[])) {
      invoiceMap.set(invoice.id, invoice);
    }

    const rawInvoices = Array.from(invoiceMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, RESULTS_LIMIT);

    // Transform results to match our types
    // Note: Supabase returns joined data as objects (not arrays) for single-row joins
    const customers: CustomerSearchResult[] = (customersResult.data ?? []).map(
      (c) => ({
        id: c.id,
        name: c.name,
        phone_number: c.phone_number,
        email: c.email,
        address: c.address,
      })
    );

    const quotes: QuoteSearchResult[] = (quotesResult.data ?? []).map((q) => {
      const customerData = q.customers as unknown as {
        name: string | null;
        phone_number: string;
      } | null;
      return {
        id: q.id,
        short_ref: q.short_ref,
        description: q.description,
        total_cents: q.total_cents,
        status: q.status,
        customer: customerData,
      };
    });

    const invoices: InvoiceSearchResult[] = rawInvoices.map((i) => ({
      id: i.id,
      amount_cents: i.amount_cents,
      status: i.status,
      created_at: i.created_at,
      customer: i.customers,
    }));

    const messages: MessageSearchResult[] = (messagesResult.data ?? []).map(
      (m) => {
        const customerData = m.customers as unknown as {
          name: string | null;
          phone_number: string;
        } | null;
        return {
          id: m.id,
          body: m.body,
          created_at: m.created_at,
          customer_id: m.customer_id,
          customer: customerData,
        };
      }
    );

    return {
      success: true,
      data: { customers, quotes, invoices, messages },
    };
  } catch (error) {
    console.error('[Search] Error:', error);
    return {
      success: false,
      error: 'Search failed. Please try again.',
    };
  }
}
