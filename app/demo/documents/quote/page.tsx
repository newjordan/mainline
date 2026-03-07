import { DocumentTemplate } from '@/components/templates/document-template';
import {
  getDemoCustomerById,
  getDemoQuoteById,
} from '@/lib/demo/demo-data';
import { getPublicContactConfig } from '@/lib/config/contact';

type SearchParams = Promise<{
  quote?: string;
}>;

export default async function DemoQuoteDocumentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const quote =
    (params.quote ? getDemoQuoteById(params.quote) : null) ||
    getDemoQuoteById('demo-quote-1');

  if (!quote) {
    throw new Error('Demo quote preview is not configured.');
  }

  const customer = getDemoCustomerById(quote.customer_id);
  if (!customer) {
    throw new Error('Demo quote customer is not configured.');
  }

  const { smsPhoneE164: businessPhone } = getPublicContactConfig();
  const validUntil = new Date(quote.created_at);
  validUntil.setDate(validUntil.getDate() + 30);
  const confirmationCode = quote.short_ref.replace(/\D/g, '').slice(-4) || '1042';

  return (
    <main
      data-demo-document-preview
      className="min-h-screen bg-slate-50 px-4 py-6 text-gray-900"
    >
      <div className="mx-auto max-w-2xl">
        <DocumentTemplate
          type="quote"
          date={new Date(quote.created_at)}
          customerName={customer.name || 'Customer'}
          customerPhone={customer.phone_number}
          customerAddress={quote.service_address || customer.address || undefined}
          description={quote.description}
          lineItems={quote.line_items}
          totalCents={quote.total_cents}
          status="sent"
          validUntil={validUntil}
          businessPhone={businessPhone}
          acceptanceInstructions={
            <div className="rounded-lg bg-blue-50 p-5 text-center">
              <p className="text-lg font-semibold text-blue-900">Ready to proceed?</p>
              <p className="mt-2 text-blue-800">Reply to the text message with:</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">YES {confirmationCode}</p>
            </div>
          }
        />
      </div>
    </main>
  );
}
