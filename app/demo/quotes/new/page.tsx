import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DemoNewQuoteForm } from '@/components/demo/demo-new-quote-form';
import {
  getDemoCustomerById,
  getDemoCustomers,
  getDemoQuoteById,
  getDemoQuotesByCustomerId,
} from '@/lib/demo/demo-data';
import {
  buildDemoQuotesHref,
} from '@/lib/demo-paths';

type SearchParams = Promise<{
  customer?: string;
}>;

export default async function DemoNewQuotePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const customers = getDemoCustomers();
  const customer =
    (params.customer ? getDemoCustomerById(params.customer) : null) ||
    getDemoCustomerById('demo-customer-1') ||
    customers[0] ||
    null;
  const customerQuotes = customer ? getDemoQuotesByCustomerId(customer.id) : [];
  const draftQuote =
    customerQuotes.find((quote) => quote.status === 'draft') ||
    customerQuotes[customerQuotes.length - 1] ||
    getDemoQuoteById('demo-quote-3');

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={buildDemoQuotesHref({ customer: customer?.id })}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to quotes"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Quote</h1>
          <p className="text-sm text-muted-foreground">Draft, review, then send to the customer</p>
        </div>
      </div>

      <DemoNewQuoteForm customers={customers} customer={customer} draftQuote={draftQuote} />
    </div>
  );
}
