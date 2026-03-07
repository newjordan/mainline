import { NextResponse } from 'next/server';
import {
  getInvoicesNeedingReminder,
  sendReminder,
  markInvoiceOverdue,
} from '@/lib/services/payment-reminders';
import { timingSafeCompare } from '@/lib/timing-safe-compare';

/**
 * Payment Reminders Cron Job
 *
 * Runs daily at 9 AM (configured in vercel.json).
 * Sends reminder SMS for unpaid invoices:
 * - Day 3: Gentle reminder
 * - Day 7: Follow-up + marks invoice as overdue
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)) {
    console.error('[Cron] Unauthorized payment reminders request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    day3: { found: 0, sent: 0 },
    day7: { found: 0, sent: 0, markedOverdue: 0 },
  };

  try {
    // Process Day 3 reminders (gentle reminder)
    const day3Invoices = await getInvoicesNeedingReminder('day3');
    results.day3.found = day3Invoices.length;

    for (const invoice of day3Invoices) {
      const sent = await sendReminder(invoice, 'day3');
      if (sent) {
        results.day3.sent++;
      }
    }

    // Process Day 7 reminders (follow-up + mark overdue)
    const day7Invoices = await getInvoicesNeedingReminder('day7');
    results.day7.found = day7Invoices.length;

    for (const invoice of day7Invoices) {
      const sent = await sendReminder(invoice, 'day7');
      if (sent) {
        results.day7.sent++;
      }

      // Mark as overdue regardless of SMS success
      // (invoice is genuinely overdue at this point)
      const markedOverdue = await markInvoiceOverdue(invoice.id);
      if (markedOverdue) {
        results.day7.markedOverdue++;
      }
    }

    // Log summary
    console.log(
      `[Cron] Payment reminders complete: ` +
        `Day3: ${results.day3.sent}/${results.day3.found} sent, ` +
        `Day7: ${results.day7.sent}/${results.day7.found} sent, ` +
        `${results.day7.markedOverdue} marked overdue`
    );

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Payment reminders error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal error',
        results,
      },
      { status: 500 }
    );
  }
}
