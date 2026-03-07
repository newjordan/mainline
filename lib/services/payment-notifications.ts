import { getInvoice } from '@/lib/server/invoices';
import { getCustomer } from '@/lib/server/customers';
import { createMessage } from '@/lib/server/messages';
import { getPaymentReceiptUrl } from '@/lib/integrations/payments';
import { sendSMS } from '@/lib/integrations/twilio';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import type { ActionResult } from '@/types';

/**
 * Notify admin and customer when a payment is received.
 *
 * Fire-and-forget pattern - logs errors but never throws.
 * If ADMIN_PHONE_NUMBER is not configured, only the customer receipt SMS is sent.
 *
 * @param invoiceId - The invoice that was paid
 */
export async function notifyPaymentReceived(invoiceId: string): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;

  try {
    // Fetch invoice details
    const invoiceResult = await getInvoice(invoiceId);
    if (!invoiceResult.success || !invoiceResult.data) {
      console.error(
        `[Notifications] Invoice not found for notification: ${invoiceId.slice(0, 8)}...`
      );
      return;
    }

    const invoice = invoiceResult.data;

    // Fetch customer details
    const customerResult = await getCustomer(invoice.customer_id);
    const customer = customerResult.success ? customerResult.data : null;
    const customerName = customer
      ? customer.name || formatPhoneNumber(customer.phone_number)
      : 'Unknown Customer';

    if (adminPhone) {
      // Format and send admin notification
      const adminMessage = `Job paid! ${customerName} - ${formatCents(invoice.amount_cents)}`;

      const adminSmsResult = await sendSMS(adminPhone, adminMessage);

      if (adminSmsResult.success) {
        console.log(
          `[Notifications] Admin payment notification sent for invoice ${invoiceId.slice(0, 8)}...`
        );
      } else {
        console.error(
          '[Notifications] Failed to send admin payment notification:',
          adminSmsResult.error
        );
      }
    }

    if (!customer) {
      return;
    }

    const receiptUrlResult: ActionResult<string | null> = invoice.stripe_payment_id
      ? await getPaymentReceiptUrl(invoice.stripe_payment_id)
      : { success: true, data: null as string | null };

    if (!receiptUrlResult.success) {
      console.error('[Notifications] Failed to fetch payment receipt URL:', receiptUrlResult.error);
    }

    const receiptUrl = receiptUrlResult.success ? receiptUrlResult.data : null;
    const customerMessage =
      `Payment received - thank you!\n` +
      `Amount: ${formatCents(invoice.amount_cents)}\n` +
      (receiptUrl ? `Receipt: ${receiptUrl}\n` : '') +
      `Reply if you need anything else.`;

    const customerSmsResult = await sendSMS(customer.phone_number, customerMessage);

    await createMessage({
      customer_id: invoice.customer_id,
      direction: 'outbound',
      body: customerMessage,
      twilio_sid: customerSmsResult.success ? customerSmsResult.data : undefined,
      status: customerSmsResult.success ? 'sent' : 'failed',
    }).catch((err) => {
      console.error('[Notifications] Failed to log customer receipt SMS:', err);
    });

    if (customerSmsResult.success) {
      console.log(
        `[Notifications] Customer receipt SMS sent for invoice ${invoiceId.slice(0, 8)}...`
      );
    } else {
      console.error('[Notifications] Failed to send customer receipt SMS:', customerSmsResult.error);
    }
  } catch (error) {
    // Never throw - this is fire-and-forget
    console.error('[Notifications] Payment notification error:', error);
  }
}

