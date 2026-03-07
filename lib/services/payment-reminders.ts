import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  markWebhookProcessed,
  unmarkWebhookProcessed,
} from '@/lib/utils/webhook-idempotency';
import { sendSMS } from '@/lib/integrations/twilio';
import { createMessage } from '@/lib/server/messages';
import { formatCents } from '@/lib/utils/format-currency';

// =============================================================================
// Payment Reminders Service
// =============================================================================
// Handles automatic payment reminder SMS for unpaid invoices.
// Uses webhook_events table for idempotent reminder tracking.
// =============================================================================

export type ReminderType = 'day3' | 'day7';

export interface InvoiceForReminder {
  id: string;
  amount_cents: number;
  stripe_payment_link: string;
  customer_id: string;
  customer_phone: string;
  sent_at: string;
}

/**
 * Get invoices that need a specific reminder type
 *
 * @param reminderType - 'day3' for 3-day reminder, 'day7' for 7-day reminder
 * @returns Array of invoices needing this reminder
 */
export async function getInvoicesNeedingReminder(
  reminderType: ReminderType
): Promise<InvoiceForReminder[]> {
  const supabase = createServiceRoleClient();
  const now = new Date();

  // Calculate cutoff date based on reminder type
  const daysAgo = reminderType === 'day3' ? 3 : 7;
  const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  // For day3: sent 3+ days ago but less than 7 days
  // For day7: sent 7+ days ago
  const maxCutoff =
    reminderType === 'day3'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : null;

  // Query sent invoices older than cutoff with payment link
  let query = supabase
    .from('invoices')
    .select(
      `
      id,
      amount_cents,
      stripe_payment_link,
      customer_id,
      sent_at,
      customers!inner(phone_number)
    `
    )
    .eq('status', 'sent')
    .is('archived_at', null)
    .lt('sent_at', cutoffDate.toISOString())
    .not('stripe_payment_link', 'is', null);

  // For day3, exclude invoices that are 7+ days old (they get day7 reminder instead)
  if (maxCutoff) {
    query = query.gte('sent_at', maxCutoff.toISOString());
  }

  const { data: invoices, error } = await query;

  if (error) {
    console.error('[Reminders] Query error:', error);
    return [];
  }

  if (!invoices || invoices.length === 0) {
    return [];
  }

  // Batch check: get all already-sent reminders for these invoices in ONE query
  const eventIds = invoices.map((inv) => `${inv.id}:${reminderType}`);
  const { data: existingReminders } = await supabase
    .from('webhook_events')
    .select('event_id')
    .eq('provider', 'reminder')
    .in('event_id', eventIds);

  const alreadySentSet = new Set(existingReminders?.map((r) => r.event_id) || []);

  // Filter out invoices that already received this reminder
  const needsReminder: InvoiceForReminder[] = [];

  for (const invoice of invoices) {
    const eventId = `${invoice.id}:${reminderType}`;

    if (!alreadySentSet.has(eventId)) {
      // Type assertion for the joined customer data
      const customerData = invoice.customers as unknown as { phone_number: string };

      needsReminder.push({
        id: invoice.id,
        amount_cents: invoice.amount_cents,
        stripe_payment_link: invoice.stripe_payment_link!,
        customer_id: invoice.customer_id,
        customer_phone: customerData.phone_number,
        sent_at: invoice.sent_at!,
      });
    }
  }

  return needsReminder;
}

/**
 * Send a payment reminder to a customer
 *
 * @param invoice - Invoice data including customer phone
 * @param reminderType - Type of reminder to send
 * @returns true if SMS sent successfully
 */
export async function sendReminder(
  invoice: InvoiceForReminder,
  reminderType: ReminderType
): Promise<boolean> {
  const eventId = `${invoice.id}:${reminderType}`;

  // Claim idempotency slot before sending (prevents duplicate reminders in parallel runs)
  try {
    const claimed = await markWebhookProcessed('reminder', eventId, 'reminder.sent');
    if (!claimed) {
      console.log(`[Reminders] Already sent: ${eventId}`);
      return false;
    }
  } catch (error) {
    console.error(`[Reminders] Failed to claim idempotency slot for ${eventId}:`, error);
    return false;
  }

  // Format amount
  const amount = formatCents(invoice.amount_cents);

  // Format message based on reminder type
  const message =
    reminderType === 'day3'
      ? `Just a friendly reminder - your invoice for ${amount} is still unpaid.\n\nPay here: ${invoice.stripe_payment_link}\n\nQuestions? Just reply to this text!`
      : `Following up on your invoice for ${amount}.\n\nPay here: ${invoice.stripe_payment_link}\n\nPlease let us know if you have any concerns.`;

  // Send SMS
  const result = await sendSMS(invoice.customer_phone, message);

  // Log to conversation history
  await createMessage({
    customer_id: invoice.customer_id,
    direction: 'outbound',
    body: message,
    twilio_sid: result.success ? result.data : undefined,
    status: result.success ? 'sent' : 'failed',
  }).catch((err) => {
    console.error('[Reminders] Failed to log message:', err);
  });

  // Log result
  const maskedInvoiceId = invoice.id.slice(0, 8) + '...';
  if (result.success) {
    console.log(`[Reminders] Sent ${reminderType} reminder for invoice ${maskedInvoiceId}`);
  } else {
    console.error(
      `[Reminders] Failed to send ${reminderType} reminder for ${maskedInvoiceId}:`,
      result.error
    );
    // Release claim so failed reminder can be retried on next run.
    await unmarkWebhookProcessed('reminder', eventId).catch((unmarkError) => {
      console.error(`[Reminders] Failed to release idempotency marker for ${eventId}:`, unmarkError);
    });
  }

  return result.success;
}


/**
 * Mark an invoice as overdue
 *
 * @param invoiceId - Invoice to mark as overdue
 * @returns true if invoice was updated, false if already paid or not found
 */
export async function markInvoiceOverdue(invoiceId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const maskedId = invoiceId.slice(0, 8) + '...';

  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('status', 'sent') // Only if still sent (not paid in the meantime)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[Reminders] Failed to mark overdue: ${maskedId}`, error);
    return false;
  }

  if (data) {
    console.log(`[Reminders] Marked overdue: ${maskedId}`);
    return true;
  } else {
    // No rows updated - invoice was likely paid between query and update
    console.log(`[Reminders] Invoice ${maskedId} already paid or not found, skipping overdue`);
    return false;
  }
}
