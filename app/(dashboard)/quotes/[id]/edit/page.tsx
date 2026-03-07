import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getQuote } from '@/lib/actions/quotes';
import { getCustomer } from '@/lib/actions/customers';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { EditQuoteForm } from './edit-quote-form';

interface EditQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params;
  const quoteResult = await getQuote(id);

  if (!quoteResult.success || !quoteResult.data) {
    notFound();
  }

  const quote = quoteResult.data;
  const customerResult = await getCustomer(quote.customer_id);
  const customer = customerResult.success ? customerResult.data : null;

  const displayName =
    customer?.name ||
    (customer?.phone_number ? formatPhoneNumber(customer.phone_number) : 'Unknown');

  return (
    <div className="p-4">
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link
          href={`/quotes/${quote.id}`}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to quote"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Edit Quote</h1>
          <p className="truncate text-sm text-muted-foreground">for {displayName}</p>
        </div>
      </div>

      {quote.superseded_at ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-500">
            This quote has been superseded and can&apos;t be edited.
          </p>
          <Link href="/quotes" className="mt-2 inline-block text-sm underline">
            Back to quotes
          </Link>
        </div>
      ) : quote.archived_at ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-500">
            This quote is archived. Unarchive it before editing.
          </p>
          <Link href={`/quotes/${quote.id}`} className="mt-2 inline-block text-sm underline">
            Back to quote
          </Link>
        </div>
      ) : (
        <EditQuoteForm quote={quote} />
      )}
    </div>
  );
}
