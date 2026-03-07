'use server';

import type { ActionResult } from '@/types';
import type {
  Invoice,
  InvoiceInsert,
  InvoiceLineItem,
  InvoiceUpdate,
  Customer,
  QuoteLineItem,
} from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdminSession } from '@/lib/require-admin-session';
import { invoiceUpdateSchema } from '@/lib/schemas/invoice';
import { getCustomer } from '@/lib/actions/customers';
import { getQuote } from '@/lib/actions/quotes';
import { createMessage } from '@/lib/actions/messages';
import { createPaymentLink, isPaymentsDisabledError } from '@/lib/integrations/payments';
import { sendSMS } from '@/lib/integrations/twilio';
import { formatCents } from '@/lib/utils/format-currency';
import { getBusinessProfile, interpolateBusinessText } from '@/lib/config/business-profile';

/**
 * Extended result type for send operations that includes SMS delivery status
 */
export interface SendInvoiceResult {
  invoice: Invoice;
  smsDelivered: boolean;
}

/**
 * Validate UUID format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Mask invoice ID for logging (show first 8 chars only)
 */
function maskInvoiceId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

/**
 * Mask phone number for logging (show last 4 digits only)
 */
function maskPhone(phone: string): string {
  if (phone.length < 4) return '****';
  return `****${phone.slice(-4)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

function normalizeInvoiceNote(note?: string | null): string | null {
  if (!note) return null;
  const normalized = note.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeJobDescription(description?: string | null): string | null {
  if (!description) return null;
  const normalized = description.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInvoiceLineItems(
  lineItems?: InvoiceLineItem[] | null
): InvoiceLineItem[] {
  if (!lineItems || lineItems.length === 0) return [];

  return lineItems
    .map((item) => ({
      description: item.description.trim(),
      amount_cents: Math.round(item.amount_cents),
    }))
    .filter((item) => item.description.length > 0 && item.amount_cents !== 0);
}

type InvoiceLifecycleFields = {
  archived_at?: string | null;
  completed_at?: string | null;
};

function buildInvoiceSmsBody(params: {
  amountCents: number;
  paymentLink: string;
  isReminder?: boolean;
  adjustmentNote?: string | null;
}): string {
  const profile = getBusinessProfile();
  const intro = params.isReminder ? 'Reminder: Your invoice is ready!' : 'Your invoice is ready!';
  const normalizedNote = normalizeInvoiceNote(params.adjustmentNote);
  const compactNote = normalizedNote
    ? normalizedNote.replace(/\s+/g, ' ').slice(0, 220)
    : null;
  const noteLine = compactNote ? `\nNote: ${compactNote}` : '';

  return `${intro}\n\nAmount: ${formatCents(params.amountCents)}${noteLine}\n\nPay now: ${params.paymentLink}\n\n${interpolateBusinessText(profile.sms.invoiceThanks)}`;
}

/**
 * Context needed for sending an invoice
 */
interface InvoiceSendContext {
  invoice: Invoice;
  customer: Customer;
  description: string;
}

/**
 * Prepares the context needed for sending an invoice
 * Validates invoice, fetches customer and quote description
 *
 * Used by both sendInvoice and resendInvoice to avoid code duplication
 */
async function prepareInvoiceSendContext(
  invoice: Invoice,
  allowedStatuses: Invoice['status'][]
): Promise<ActionResult<InvoiceSendContext>> {
  // Validate status
  if (!allowedStatuses.includes(invoice.status)) {
    const statusList = allowedStatuses.join(' or ');
    return { success: false, error: `Invoice must be in ${statusList} status` };
  }

  // Get customer for phone number
  const customerResult = await getCustomer(invoice.customer_id);
  if (!customerResult.success || !customerResult.data) {
    return { success: false, error: 'Customer not found' };
  }
  const customer = customerResult.data;

  if (!customer.phone_number) {
    return { success: false, error: 'Customer has no phone number' };
  }

  // Respect explicit STOP/opt-out requests to reduce compliance risk.
  if (customer.sms_consent === false && customer.sms_consent_at) {
    return {
      success: false,
      error: 'Customer has opted out of SMS. Ask them to text START to opt back in before resending invoices.',
    };
  }

  // Get quote for description (if linked)
  const invoiceJobDescription = normalizeJobDescription(invoice.job_description);
  let description = invoiceJobDescription || 'Service Work';
  if (!invoiceJobDescription && invoice.quote_id) {
    const quoteResult = await getQuote(invoice.quote_id);
    if (quoteResult.success && quoteResult.data) {
      description = quoteResult.data.description || 'Service Work';
    }
  }

  return {
    success: true,
    data: { invoice, customer, description },
  };
}

/**
 * Get all invoices (for list view)
 */
export async function getInvoices(): Promise<ActionResult<Invoice[]>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Invoices] getInvoices error:', error);
      return { success: false, error: 'Failed to fetch invoices' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Invoices] getInvoices exception:', error);
    return { success: false, error: 'Failed to fetch invoices' };
  }
}

/**
 * Internal helper: fetch invoice by ID without auth.
 * Used by webhook-called functions (markInvoicePaid) and auth-guarded exports.
 */
async function _getInvoiceInternal(
  id: string
): Promise<ActionResult<Invoice | null>> {
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
 * Get a single invoice by ID.
 * Dashboard-facing: requires authenticated session.
 */
export async function getInvoice(
  id: string
): Promise<ActionResult<Invoice | null>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  return _getInvoiceInternal(id);
}

/**
 * Get all invoices for a specific customer
 */
export async function getCustomerInvoices(
  customerId: string
): Promise<ActionResult<Invoice[]>> {
  if (!isValidUUID(customerId)) {
    return { success: true, data: [] };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Invoices] getCustomerInvoices error:', error);
      return { success: false, error: 'Failed to fetch customer invoices' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Invoices] getCustomerInvoices exception:', error);
    return { success: false, error: 'Failed to fetch customer invoices' };
  }
}

/**
 * Get invoice by quote ID
 */
export async function getInvoiceByQuoteId(
  quoteId: string
): Promise<ActionResult<Invoice | null>> {
  if (!isValidUUID(quoteId)) {
    return { success: true, data: null };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('[Invoices] getInvoiceByQuoteId error:', error);
      return { success: false, error: 'Failed to fetch invoice' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Invoices] getInvoiceByQuoteId exception:', error);
    return { success: false, error: 'Failed to fetch invoice' };
  }
}

/**
 * Get a payable invoice by provider payment reference (order ID, checkout ID, etc.).
 *
 * Uses the provider reference column currently stored as `stripe_payment_id`.
 */
export async function getPayableInvoiceByPaymentReference(
  paymentReference: string
): Promise<ActionResult<Invoice | null>> {
  if (!paymentReference || paymentReference.trim() === '') {
    return { success: true, data: null };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Invoice | null>;

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
 * Create an invoice from an accepted quote
 *
 * Validation rules:
 * 1. Quote must exist
 * 2. Quote must be in 'accepted' status
 * 3. No existing invoice for this quote (prevent duplicates)
 *
 * Creates invoice with:
 * - quote_id: Link to source quote
 * - customer_id: From quote
 * - amount_cents: From quote.total_cents (or explicit override)
 * - status: 'draft' (always starts as draft)
 */
export async function createInvoiceFromQuote(
  quoteId: string,
  amountCentsOverride?: number,
  adjustmentNote?: string,
  jobDescription?: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(quoteId)) {
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
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('[Invoices] createInvoiceFromQuote - quote not found:', quoteError);
      return { success: false, error: 'Quote not found' };
    }

    // 2. Validate quote status - must be accepted
    if (quote.status !== 'accepted') {
      return { success: false, error: 'Quote must be accepted first' };
    }

    // 3. Check for existing invoice (prevent duplicates)
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('quote_id', quoteId)
      .single();

    if (existingInvoice) {
      return { success: false, error: 'Invoice already exists for this quote' };
    }

    const finalAmountCents =
      typeof amountCentsOverride === 'number' && Number.isFinite(amountCentsOverride)
        ? Math.round(amountCentsOverride)
        : quote.total_cents;
    const normalizedAdjustmentNote = normalizeInvoiceNote(adjustmentNote);
    const normalizedJobDescription = normalizeJobDescription(
      jobDescription ?? quote.description
    );
    const normalizedLineItems = normalizeInvoiceLineItems(
      (quote.line_items as QuoteLineItem[]) ?? []
    );

    if (finalAmountCents <= 0) {
      return { success: false, error: 'Invoice amount must be greater than 0' };
    }
    if (normalizedAdjustmentNote && normalizedAdjustmentNote.length > 1000) {
      return { success: false, error: 'Adjustment note must be 1000 characters or less' };
    }
    if (normalizedJobDescription && normalizedJobDescription.length > 2000) {
      return { success: false, error: 'Job description must be 2000 characters or less' };
    }
    if (finalAmountCents !== quote.total_cents && !normalizedAdjustmentNote) {
      return {
        success: false,
        error: 'Adjustment note is required when invoice total differs from quote total',
      };
    }

    // 4. Create the invoice
    // Note: Database has unique constraint on quote_id, so if two requests
    // race to create an invoice for the same quote, only one will succeed.
    const insertData: InvoiceInsert = {
      quote_id: quoteId,
      customer_id: quote.customer_id,
      amount_cents: finalAmountCents,
      adjustment_note: normalizedAdjustmentNote,
      job_description: normalizedJobDescription,
      line_items: normalizedLineItems,
      service_address: quote.service_address?.trim() || null,
      status: 'draft',
    };

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      // Handle race condition: unique constraint violation on quote_id
      if (insertError.code === '23505') {
        console.log(`[Invoices] Race condition: invoice already exists for quote ${maskInvoiceId(quoteId)}`);
        return { success: false, error: 'Invoice already exists for this quote' };
      }
      console.error('[Invoices] createInvoiceFromQuote error:', insertError);
      return { success: false, error: 'Failed to create invoice' };
    }

    console.log(`[Invoices] Created invoice ${maskInvoiceId(invoice.id)} from quote ${maskInvoiceId(quoteId)}`);
    return { success: true, data: invoice };
  } catch (error) {
    console.error('[Invoices] createInvoiceFromQuote exception:', error);
    return { success: false, error: 'Failed to create invoice' };
  }
}

/**
 * Update an invoice
 *
 * Allowed updates:
 * - amount_cents: Editable only while status is 'draft'
 * - adjustment_note: Editable only while status is 'draft'
 * - job_description: Editable only while status is 'draft'
 * - line_items: Editable only while status is 'draft'
 * - status: draft → sent → paid (or overdue)
 * - stripe_payment_link: Set when sending with the provider payment link URL
 * - stripe_payment_id: Set with provider reference when sending, payment ID when paid
 * - sent_at: Set when sending
 * - paid_at: Set when paid
 */
/**
 * Internal helper: update an invoice without auth.
 * Used by webhook-called functions (markInvoicePaid) and other internal callers (sendInvoice).
 */
async function _updateInvoiceInternal(
  id: string,
  updates: InvoiceUpdate
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  // Validate updates with Zod schema
  const validation = invoiceUpdateSchema.safeParse(updates);
  if (!validation.success) {
    console.error('[Invoices] updateInvoice validation error:', validation.error.flatten());
    return { success: false, error: 'Invalid invoice data' };
  }

  const validatedUpdates = validation.data;
  const normalizedUpdateNote =
    validatedUpdates.adjustment_note !== undefined
      ? normalizeInvoiceNote(validatedUpdates.adjustment_note)
      : undefined;
  if (normalizedUpdateNote !== undefined) {
    validatedUpdates.adjustment_note = normalizedUpdateNote;
    if (normalizedUpdateNote && normalizedUpdateNote.length > 1000) {
      return { success: false, error: 'Adjustment note must be 1000 characters or less' };
    }
  }

  const normalizedJobDescription =
    validatedUpdates.job_description !== undefined
      ? normalizeJobDescription(validatedUpdates.job_description)
      : undefined;
  if (normalizedJobDescription !== undefined) {
    validatedUpdates.job_description = normalizedJobDescription;
    if (normalizedJobDescription && normalizedJobDescription.length > 2000) {
      return { success: false, error: 'Job description must be 2000 characters or less' };
    }
  }

  if (validatedUpdates.line_items !== undefined) {
    const normalizedLineItems = normalizeInvoiceLineItems(
      validatedUpdates.line_items as unknown as InvoiceLineItem[]
    );
    const lineItemTotal = normalizedLineItems.reduce(
      (sum, item) => sum + item.amount_cents,
      0
    );

    if (normalizedLineItems.length === 0) {
      return { success: false, error: 'Invoice must have at least one line item' };
    }

    if (lineItemTotal <= 0) {
      return { success: false, error: 'Invoice total must be greater than $0.00' };
    }

    validatedUpdates.line_items = normalizedLineItems;

    // Keep amount in sync whenever line items are updated.
    validatedUpdates.amount_cents = lineItemTotal;
  }

  try {
    const supabase = createServiceRoleClient();

    // Get current invoice for validation
    const { data: current, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Invoice not found' };
    }

    const touchesDraftOnlyFields =
      validatedUpdates.amount_cents !== undefined ||
      validatedUpdates.adjustment_note !== undefined ||
      validatedUpdates.job_description !== undefined ||
      validatedUpdates.line_items !== undefined;

    if (touchesDraftOnlyFields && current.status !== 'draft') {
      return {
        success: false,
        error:
          'Invoice details can only be updated while invoice is in draft status',
      };
    }

    if (current.quote_id) {
      const touchesAmountOrNote =
        validatedUpdates.amount_cents !== undefined ||
        validatedUpdates.adjustment_note !== undefined;

      if (touchesAmountOrNote) {
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .select('total_cents')
          .eq('id', current.quote_id)
          .single();

        if (quoteError || !quote) {
          return { success: false, error: 'Related quote not found' };
        }

        const nextAmount = validatedUpdates.amount_cents ?? current.amount_cents;
        const nextNoteInput =
          validatedUpdates.adjustment_note === undefined
            ? current.adjustment_note
            : validatedUpdates.adjustment_note;
        const nextNote = normalizeInvoiceNote(nextNoteInput);

        if (nextAmount !== quote.total_cents && !nextNote) {
          return {
            success: false,
            error: 'Adjustment note is required when invoice total differs from quote total',
          };
        }

        if (validatedUpdates.adjustment_note !== undefined) {
          validatedUpdates.adjustment_note = nextNote;
        }
      }
    }

    // Validate status transitions if status is being updated
    if (validatedUpdates.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['sent'],
        sent: ['paid', 'overdue'],
        overdue: ['paid'],
        paid: [], // Terminal state
      };

      const allowedNextStates = validTransitions[current.status] || [];
      if (!allowedNextStates.includes(validatedUpdates.status)) {
        return {
          success: false,
          error: `Cannot transition from ${current.status} to ${validatedUpdates.status}`,
        };
      }
    }

    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update(validatedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Invoices] updateInvoice error:', updateError);
      return { success: false, error: 'Failed to update invoice' };
    }

    console.log(`[Invoices] Updated invoice ${maskInvoiceId(id)}, status: ${invoice.status}`);
    return { success: true, data: invoice };
  } catch (error) {
    console.error('[Invoices] updateInvoice exception:', error);
    return { success: false, error: 'Failed to update invoice' };
  }
}

/**
 * Update an existing invoice.
 * Dashboard-facing: requires authenticated session.
 */
export async function updateInvoice(
  id: string,
  updates: InvoiceUpdate
): Promise<ActionResult<Invoice>> {
  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  return _updateInvoiceInternal(id, updates);
}

/**
 * Send an invoice with payment link via SMS
 *
 * Flow:
 * 1. Validate invoice exists and is in 'draft' status
 * 2. Get customer phone number and quote description
 * 3. Create payment link (with idempotency key)
 * 4. Update invoice with payment link, status='sent', sent_at
 * 5. Send SMS with payment link
 * 6. Log message in conversation history
 *
 * @param id - Invoice ID to send
 * @returns Updated invoice and SMS delivery status
 */
export async function sendInvoice(id: string): Promise<ActionResult<SendInvoiceResult>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    // 1. Get invoice (already auth-guarded above, use internal helper)
    const invoiceResult = await _getInvoiceInternal(id);
    if (!invoiceResult.success || !invoiceResult.data) {
      return { success: false, error: 'Invoice not found' };
    }

    // 2. Prepare send context (validates status, gets customer & description)
    const contextResult = await prepareInvoiceSendContext(invoiceResult.data, ['draft']);
    if (!contextResult.success) {
      return contextResult;
    }
    const { invoice, customer, description } = contextResult.data;

    // 3. Create payment link with idempotency key
    const linkResult = await createPaymentLink({
      amountCents: invoice.amount_cents,
      description: `${getBusinessProfile().companyName} - ${description}`,
      metadata: {
        invoiceId: id,
        customerId: invoice.customer_id,
      },
      idempotencyKey: `invoice-send-${id}`,
    });

    let paymentLink = invoice.stripe_payment_link || null;
    let paymentReference = invoice.stripe_payment_id || null;
    if (!linkResult.success) {
      console.error('[Invoices] sendInvoice: failed to create payment link:', linkResult.error);
      if (isPaymentsDisabledError(linkResult.error)) {
        return { success: false, error: linkResult.error };
      }
      if (!paymentLink) {
        return { success: false, error: linkResult.error || 'Failed to create payment link' };
      }
      console.warn(
        `[Invoices] sendInvoice: reusing existing payment link for ${maskInvoiceId(id)} due to link generation failure`
      );
    } else {
      paymentLink = linkResult.data.url;
      paymentReference = linkResult.data.providerPaymentId ?? null;
    }
    if (!paymentLink) {
      return { success: false, error: 'Failed to create payment link' };
    }

    // 4. Send SMS with payment link FIRST (before marking as sent)
    const smsBody = buildInvoiceSmsBody({
      amountCents: invoice.amount_cents,
      paymentLink,
      adjustmentNote: invoice.adjustment_note,
    });

    const smsResult = await sendSMS(customer.phone_number!, smsBody);

    // 6. Log message in conversation history
    const messageResult = await createMessage({
      customer_id: invoice.customer_id,
      direction: 'outbound',
      body: smsBody,
      twilio_sid: smsResult.success ? smsResult.data : undefined,
      status: smsResult.success ? 'sent' : 'failed',
    });

    if (!messageResult.success) {
      console.error('[Invoices] sendInvoice: failed to log outbound message:', messageResult.error);
    }

    if (!smsResult.success) {
      console.error(
        `[Invoices] sendInvoice: SMS failed for ${maskInvoiceId(id)} to ${maskPhone(customer.phone_number!)}`
      );
      return {
        success: false,
        error:
          smsResult.error ||
          'SMS delivery failed — invoice not sent. Check the customer phone number and try again.',
      };
    }

    // 7. SMS succeeded — now mark invoice as sent
    const updatedInvoiceResult = await _updateInvoiceInternal(
      id,
      {
        status: 'sent',
        stripe_payment_link: paymentLink,
        stripe_payment_id: paymentReference,
        sent_at: new Date().toISOString(),
      }
    );

    if (!updatedInvoiceResult.success) {
      console.error('[Invoices] sendInvoice: SMS sent but invoice status update failed');
      // SMS already delivered, so don't return failure — log and continue
    }

    console.log(`[Invoices] Sent invoice ${maskInvoiceId(id)} to ${maskPhone(customer.phone_number!)}`);
    return {
      success: true,
      data: {
        invoice: updatedInvoiceResult.success
          ? updatedInvoiceResult.data!
          : {
              ...invoice,
              status: 'sent' as const,
              stripe_payment_link: paymentLink,
              stripe_payment_id: paymentReference,
            },
        smsDelivered: true,
      },
    };
  } catch (error) {
    console.error('[Invoices] sendInvoice exception:', error);
    return {
      success: false,
      error: `Failed to send invoice: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Resend an invoice that was already sent
 *
 * Creates a new payment link and sends SMS again.
 * Used when customer lost the original link or needs a reminder.
 *
 * @param id - Invoice ID to resend
 * @returns Updated invoice and SMS delivery status
 */
export async function resendInvoice(id: string): Promise<ActionResult<SendInvoiceResult>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    // 1. Get invoice (already auth-guarded above, use internal helper)
    const invoiceResult = await _getInvoiceInternal(id);
    if (!invoiceResult.success || !invoiceResult.data) {
      return { success: false, error: 'Invoice not found' };
    }

    // 2. Prepare send context (validates status, gets customer & description)
    const contextResult = await prepareInvoiceSendContext(invoiceResult.data, ['sent', 'overdue']);
    if (!contextResult.success) {
      return contextResult;
    }
    const { invoice, customer, description } = contextResult.data;

    // 3. Create NEW payment link (old one may have expired)
    // Use timestamp-based idempotency key since resends should create new links
    const linkResult = await createPaymentLink({
      amountCents: invoice.amount_cents,
      description: `${getBusinessProfile().companyName} - ${description}`,
      metadata: {
        invoiceId: id,
        customerId: invoice.customer_id,
      },
      idempotencyKey: `invoice-resend-${id}-${Date.now()}`,
    });

    let paymentLink = invoice.stripe_payment_link || null;
    let paymentReference = invoice.stripe_payment_id || null;
    let createdFreshLink = false;
    if (!linkResult.success) {
      console.error('[Invoices] resendInvoice: failed to create payment link:', linkResult.error);
      if (isPaymentsDisabledError(linkResult.error)) {
        return { success: false, error: linkResult.error };
      }
      if (!paymentLink) {
        return { success: false, error: linkResult.error || 'Failed to create payment link' };
      }
      console.warn(
        `[Invoices] resendInvoice: reusing existing payment link for ${maskInvoiceId(id)} due to link generation failure`
      );
    } else {
      paymentLink = linkResult.data.url;
      paymentReference = linkResult.data.providerPaymentId ?? null;
      createdFreshLink = true;
    }
    if (!paymentLink) {
      return { success: false, error: 'Failed to create payment link' };
    }

    // 4. Send SMS FIRST (before updating payment link)
    const smsBody = buildInvoiceSmsBody({
      amountCents: invoice.amount_cents,
      paymentLink,
      isReminder: true,
      adjustmentNote: invoice.adjustment_note,
    });

    const smsResult = await sendSMS(customer.phone_number!, smsBody);

    // 6. Log message in conversation history
    const messageResult = await createMessage({
      customer_id: invoice.customer_id,
      direction: 'outbound',
      body: smsBody,
      twilio_sid: smsResult.success ? smsResult.data : undefined,
      status: smsResult.success ? 'sent' : 'failed',
    });

    if (!messageResult.success) {
      console.error('[Invoices] resendInvoice: failed to log outbound message:', messageResult.error);
    }

    if (!smsResult.success) {
      console.error(
        `[Invoices] resendInvoice: SMS failed for ${maskInvoiceId(id)} to ${maskPhone(customer.phone_number!)}`
      );
      return {
        success: false,
        error:
          smsResult.error ||
          'SMS delivery failed — invoice not resent. Check the customer phone number and try again.',
      };
    }

    let updatedInvoice: Invoice | null = invoice;
    if (createdFreshLink) {
      // 7. SMS succeeded — update invoice with newly generated payment link
      const supabase = createServiceRoleClient();
      const { data, error: updateError } = await supabase
        .from('invoices')
        .update({
          stripe_payment_link: paymentLink,
          stripe_payment_id: paymentReference,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Invoices] resendInvoice: SMS sent but payment link update failed');
      } else {
        updatedInvoice = data;
      }
    }

    console.log(`[Invoices] Resent invoice ${maskInvoiceId(id)} to ${maskPhone(customer.phone_number!)}`);
    return {
      success: true,
      data: {
        invoice: updatedInvoice || invoice,
        smsDelivered: true,
      },
    };
  } catch (error) {
    console.error('[Invoices] resendInvoice exception:', error);
    return {
      success: false,
      error: `Failed to resend invoice: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Mark an invoice as paid (called by webhook)
 *
 * Validates:
 * 1. Invoice exists
 * 2. Invoice is in 'sent' or 'overdue' status
 * 3. Updates status to 'paid' with payment details
 */
export async function markInvoicePaid(
  id: string,
  paymentId: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult as ActionResult<Invoice>;

  if (!paymentId || paymentId.trim() === '') {
    return { success: false, error: 'Payment ID is required' };
  }

  // Verify invoice exists and is in a payable state (webhook context — use internal helper)
  const invoiceResult = await _getInvoiceInternal(id);
  if (!invoiceResult.success || !invoiceResult.data) {
    console.error(`[Invoices] markInvoicePaid: invoice ${maskInvoiceId(id)} not found`);
    return { success: false, error: 'Invoice not found' };
  }

  const invoice = invoiceResult.data;
  if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
    console.error(`[Invoices] markInvoicePaid: invoice ${maskInvoiceId(id)} is ${invoice.status}, cannot mark as paid`);
    return { success: false, error: `Cannot mark ${invoice.status} invoice as paid` };
  }

  return _updateInvoiceInternal(
    id,
    {
      status: 'paid',
      stripe_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    }
  );
}

/**
 * Mark an invoice's related job as completed.
 *
 * Completion tracks operational job state and is independent from payment status.
 */
export async function markInvoiceCompleted(
  id: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: current, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Invoice not found' };
    }

    const currentWithLifecycle = current as typeof current & InvoiceLifecycleFields;

    if (currentWithLifecycle.archived_at) {
      return { success: false, error: 'Unarchive invoice before marking complete' };
    }

    if (current.status === 'draft') {
      return {
        success: false,
        error: 'Send invoice before marking the job complete',
      };
    }

    const completionTime = currentWithLifecycle.completed_at ?? new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({ completed_at: completionTime })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Invoices] markInvoiceCompleted update error:', updateError);
      return { success: false, error: 'Failed to mark invoice complete' };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Invoices] markInvoiceCompleted exception:', error);
    return { success: false, error: 'Failed to mark invoice complete' };
  }
}

/**
 * Remove completion marker from an invoice.
 */
export async function markInvoiceIncomplete(
  id: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: current, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Invoice not found' };
    }

    const currentWithLifecycle = current as typeof current & InvoiceLifecycleFields;

    if (currentWithLifecycle.archived_at) {
      return {
        success: false,
        error: 'Unarchive invoice before updating completion state',
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({ completed_at: null })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Invoices] markInvoiceIncomplete update error:', updateError);
      return { success: false, error: 'Failed to update completion state' };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Invoices] markInvoiceIncomplete exception:', error);
    return { success: false, error: 'Failed to update completion state' };
  }
}

/**
 * Archive an invoice from active operational views.
 */
export async function archiveInvoice(
  id: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: current, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Invoice not found' };
    }

    if (current.status === 'sent' || current.status === 'overdue') {
      return {
        success: false,
        error: 'Cannot archive invoice while payment is still outstanding',
      };
    }

    const currentWithLifecycle = current as typeof current & InvoiceLifecycleFields;
    const archivedTime = currentWithLifecycle.archived_at ?? new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({ archived_at: archivedTime })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Invoices] archiveInvoice update error:', updateError);
      return { success: false, error: 'Failed to archive invoice' };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Invoices] archiveInvoice exception:', error);
    return { success: false, error: 'Failed to archive invoice' };
  }
}

/**
 * Restore an archived invoice to active operational views.
 */
export async function unarchiveInvoice(
  id: string
): Promise<ActionResult<Invoice>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: current, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Invoice not found' };
    }

    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({ archived_at: null })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('[Invoices] unarchiveInvoice update error:', updateError);
      return { success: false, error: 'Failed to restore invoice' };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('[Invoices] unarchiveInvoice exception:', error);
    return { success: false, error: 'Failed to restore invoice' };
  }
}

/**
 * Delete a draft invoice.
 *
 * Guardrail:
 * - Only draft invoices can be permanently deleted.
 */
export async function deleteInvoice(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid invoice ID' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (invoice.status !== 'draft') {
      return { success: false, error: 'Only draft invoices can be deleted' };
    }

    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Invoices] deleteInvoice delete error:', deleteError);
      return { success: false, error: 'Failed to delete invoice' };
    }

    return { success: true, data: { id } };
  } catch (error) {
    console.error('[Invoices] deleteInvoice exception:', error);
    return { success: false, error: 'Failed to delete invoice' };
  }
}

/**
 * Create a standalone invoice (not from a quote)
 *
 * Used when an admin user wants to create an invoice directly without a quote,
 * or for anonymous/one-off billing.
 *
 * @param input - Invoice creation data
 * @returns Created invoice
 */
export async function createInvoiceManual(input: {
  customer_id: string;
  amount_cents: number;
  line_items?: InvoiceLineItem[];
  job_description?: string;
  description?: string;
  adjustment_note?: string;
  service_address?: string;
}): Promise<ActionResult<Invoice>> {
  // Validate customer ID
  if (!isValidUUID(input.customer_id)) {
    return { success: false, error: 'Invalid customer ID' };
  }

  const normalizedLineItems = normalizeInvoiceLineItems(input.line_items);
  const lineItemTotal = normalizedLineItems.reduce(
    (sum, item) => sum + item.amount_cents,
    0
  );
  const hasLineItemsInput = Array.isArray(input.line_items);

  // Validate amount (manual amount or computed from line items)
  const finalAmountCents = hasLineItemsInput
    ? lineItemTotal
    : Math.round(input.amount_cents);
  if (!Number.isFinite(finalAmountCents) || finalAmountCents <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  if (hasLineItemsInput && normalizedLineItems.length === 0) {
    return {
      success: false,
      error: 'At least one line item with a non-zero amount is required',
    };
  }

  const normalizedAdjustmentNote = normalizeInvoiceNote(input.adjustment_note);
  if (normalizedAdjustmentNote && normalizedAdjustmentNote.length > 1000) {
    return { success: false, error: 'Adjustment note must be 1000 characters or less' };
  }
  const normalizedJobDescription = normalizeJobDescription(
    input.job_description ?? input.description
  );
  if (normalizedJobDescription && normalizedJobDescription.length > 2000) {
    return { success: false, error: 'Job description must be 2000 characters or less' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  try {
    const supabase = createServiceRoleClient();

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', input.customer_id)
      .single();

    if (customerError || !customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Create the invoice
    const insertData: InvoiceInsert = {
      customer_id: input.customer_id,
      amount_cents: finalAmountCents,
      adjustment_note: normalizedAdjustmentNote,
      job_description: normalizedJobDescription,
      line_items: normalizedLineItems,
      service_address: input.service_address?.trim() || null,
      status: 'draft',
      // No quote_id for manual invoices
    };

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[Invoices] createInvoiceManual error:', insertError);
      return { success: false, error: 'Failed to create invoice' };
    }

    console.log(`[Invoices] Created manual invoice ${maskInvoiceId(invoice.id)} for customer ${maskInvoiceId(input.customer_id)}`);
    return { success: true, data: invoice };
  } catch (error) {
    console.error('[Invoices] createInvoiceManual exception:', error);
    return { success: false, error: 'Failed to create invoice' };
  }
}

export type InvoiceBulkLifecycleOperation =
  | 'archive'
  | 'unarchive'
  | 'mark-complete';

export interface InvoiceBulkLifecycleResult {
  attempted: number;
  updated: number;
  failed: Array<{ id: string; error: string }>;
}

/**
 * Bulk lifecycle operations for invoice organization workflows.
 */
export async function bulkUpdateInvoicesLifecycle(
  ids: string[],
  operation: InvoiceBulkLifecycleOperation
): Promise<ActionResult<InvoiceBulkLifecycleResult>> {
  const uniqueIds = Array.from(new Set(ids)).filter(isValidUUID).slice(0, 200);

  if (uniqueIds.length === 0) {
    return { success: false, error: 'No valid invoice IDs selected' };
  }

  const authResult = await requireAdminSession();
  if (!authResult.success) return authResult;

  const failed: Array<{ id: string; error: string }> = [];
  let updated = 0;

  for (const id of uniqueIds) {
    const result =
      operation === 'archive'
        ? await archiveInvoice(id)
        : operation === 'unarchive'
          ? await unarchiveInvoice(id)
          : await markInvoiceCompleted(id);

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
