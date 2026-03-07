import 'server-only';

import type { ActionResult } from '@/types';
import type { Invoice } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Server-only: fetch invoice by ID (no dashboard session required).
 */
export async function getInvoice(id: string): Promise<ActionResult<Invoice | null>> {
  if (!isValidUUID(id)) {
    return { success: true, data: null };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Invoices] getInvoice error:', error);
      return { success: false, error: 'Failed to fetch invoice' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Invoices] getInvoice exception:', error);
    return { success: false, error: 'Failed to fetch invoice' };
  }
}

/**
 * Server-only: used by payment webhook handlers.
 */
export async function getPayableInvoiceByPaymentReference(
  paymentReference: string
): Promise<ActionResult<Invoice | null>> {
  if (!paymentReference || paymentReference.trim() === '') {
    return { success: true, data: null };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('stripe_payment_id', paymentReference)
      .in('status', ['sent', 'overdue'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Invoices] getPayableInvoiceByPaymentReference error:', error);
      return { success: false, error: 'Failed to fetch invoice' };
    }

    return { success: true, data: data || null };
  } catch (error) {
    console.error('[Invoices] getPayableInvoiceByPaymentReference exception:', error);
    return { success: false, error: 'Failed to fetch invoice' };
  }
}

/**
 * Server-only: mark an invoice as paid from webhook context.
 */
export async function markInvoicePaid(
  id: string,
  paymentId: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  if (!paymentId || paymentId.trim() === '') {
    return { success: false, error: 'Payment ID is required' };
  }

  const invoiceResult = await getInvoice(id);
  if (!invoiceResult.success || !invoiceResult.data) {
    console.error(`[Invoices] markInvoicePaid: invoice ${id.slice(0, 8)}... not found`);
    return { success: false, error: 'Invoice not found' };
  }

  const invoice = invoiceResult.data;
  if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
    console.error(
      `[Invoices] markInvoicePaid: invoice ${id.slice(0, 8)}... is ${invoice.status}, cannot mark as paid`
    );
    return { success: false, error: `Cannot mark ${invoice.status} invoice as paid` };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        stripe_payment_id: paymentId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Invoices] markInvoicePaid update error:', error);
      return { success: false, error: 'Failed to update invoice' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Invoices] markInvoicePaid exception:', error);
    return { success: false, error: 'Failed to update invoice' };
  }
}
