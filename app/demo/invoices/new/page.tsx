import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DemoNewInvoiceForm } from '@/components/demo/demo-new-invoice-form';
import {
  getDemoCustomerById,
  getDemoCustomers,
  getDemoInvoiceById,
  getDemoInvoices,
  getDemoInvoicesByCustomerId,
  getDemoQuoteById,
} from '@/lib/demo/demo-data';
import {
  buildDemoInvoicesHref,
  getDemoQuotePath,
} from '@/lib/demo-paths';

type SearchParams = Promise<{
  customer?: string;
  quote?: string;
}>;

export default async function DemoNewInvoicePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const customers = getDemoCustomers();
  const quote = params.quote ? getDemoQuoteById(params.quote) : null;
  const customerFromQuote = quote ? getDemoCustomerById(quote.customer_id) : null;
  const customer =
    customerFromQuote ||
    (params.customer ? getDemoCustomerById(params.customer) : null) ||
    getDemoCustomerById('demo-customer-1') ||
    customers[0] ||
    null;
  const customerInvoices = customer ? getDemoInvoicesByCustomerId(customer.id) : [];
  const draftInvoice =
    (quote
      ? getDemoInvoices().find((invoice) => invoice.quote_id === quote.id && invoice.status === 'draft')
      : null) ||
    customerInvoices.find((invoice) => invoice.status === 'draft') ||
    customerInvoices[customerInvoices.length - 1] ||
    getDemoInvoiceById('demo-invoice-5');

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={quote ? getDemoQuotePath(quote.id) : buildDemoInvoicesHref({ customer: customer?.id })}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to invoices"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Create Invoice</h1>
          <p className="text-sm text-muted-foreground">
            {quote ? `from Quote ${quote.short_ref}` : 'Simulated create flow'}
          </p>
        </div>
      </div>

      <DemoNewInvoiceForm
        customers={customers}
        customer={customer}
        quote={quote}
        draftInvoice={draftInvoice}
      />
    </div>
  );
}
