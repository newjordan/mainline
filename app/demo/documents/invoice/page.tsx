import { DocumentTemplate } from '@/components/templates/document-template';
import {
  getDemoCustomerById,
  getDemoInvoiceById,
} from '@/lib/demo/demo-data';
import { getPublicContactConfig } from '@/lib/config/contact';

type SearchParams = Promise<{
  invoice?: string;
}>;

export default async function DemoInvoiceDocumentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const invoice =
    (params.invoice ? getDemoInvoiceById(params.invoice) : null) ||
    getDemoInvoiceById('demo-invoice-1');

  if (!invoice) {
    throw new Error('Demo invoice preview is not configured.');
  }

  const customer = getDemoCustomerById(invoice.customer_id);
  if (!customer) {
    throw new Error('Demo invoice customer is not configured.');
  }

  const { smsPhoneE164: businessPhone } = getPublicContactConfig();
  const dueDate = invoice.sent_at ? new Date(invoice.sent_at) : new Date(invoice.created_at);
  dueDate.setDate(dueDate.getDate() + 14);

  return (
    <main
      data-demo-document-preview
      className="min-h-screen bg-slate-50 px-4 py-6 text-gray-900"
    >
      <div className="mx-auto max-w-2xl">
        <DocumentTemplate
          type="invoice"
          date={new Date(invoice.created_at)}
          customerName={customer.name || 'Customer'}
          customerPhone={customer.phone_number}
          customerAddress={invoice.service_address || customer.address || undefined}
          description={invoice.job_description || 'Service work completed as described.'}
          lineItems={invoice.line_items}
          totalCents={invoice.amount_cents}
          status="sent"
          dueDate={dueDate}
          invoiceNumber={invoice.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
          businessPhone={businessPhone}
          acceptanceInstructions={
            <div className="rounded-lg bg-blue-50 p-5 text-center">
              <p className="text-lg font-semibold text-blue-900">Payment Link Ready</p>
              <p className="mt-2 text-blue-800">
                Customers receive this invoice by text with a secure payment link.
              </p>
              <p className="mt-2 text-sm font-medium text-blue-900">
                Need a new link? Resend it from the operator invoice screen.
              </p>
            </div>
          }
        />
      </div>
    </main>
  );
}
