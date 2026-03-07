import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DemoInvoiceDetail } from '@/components/demo/demo-invoice-detail';
import {
  getDemoCustomerById,
  getDemoInvoiceById,
  getDemoQuoteById,
} from '@/lib/demo/demo-data';
import { buildDemoInvoicesHref } from '@/lib/demo-paths';

interface DemoInvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoInvoiceDetailPage({
  params,
}: DemoInvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = getDemoInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const customer = getDemoCustomerById(invoice.customer_id);
  if (!customer) {
    notFound();
  }

  const relatedQuote = invoice.quote_id ? getDemoQuoteById(invoice.quote_id) : null;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={buildDemoInvoicesHref({})}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to invoices"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Invoice</h1>
          <p className="text-sm text-muted-foreground">{invoice.id}</p>
        </div>
      </div>

      <DemoInvoiceDetail customer={customer} invoice={invoice} relatedQuote={relatedQuote} />
    </div>
  );
}
