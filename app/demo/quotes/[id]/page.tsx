import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DemoQuoteDetail } from '@/components/demo/demo-quote-detail';
import { getDemoCustomerById, getDemoQuoteById } from '@/lib/demo/demo-data';
import { buildDemoQuotesHref } from '@/lib/demo-paths';

interface DemoQuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoQuoteDetailPage({
  params,
}: DemoQuoteDetailPageProps) {
  const { id } = await params;
  const quote = getDemoQuoteById(id);

  if (!quote) {
    notFound();
  }

  const customer = getDemoCustomerById(quote.customer_id);
  if (!customer) {
    notFound();
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={buildDemoQuotesHref({})}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to quotes"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Quote</h1>
          <p className="text-sm text-muted-foreground">{quote.short_ref}</p>
        </div>
      </div>

      <DemoQuoteDetail customer={customer} quote={quote} />
    </div>
  );
}
