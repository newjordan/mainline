import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MapPin, Wrench, Plus } from 'lucide-react';
import { DemoConversationPanel } from '@/components/demo/demo-conversation-panel';
import { DemoPhotoGallery } from '@/components/demo/demo-photo-gallery';
import { Button } from '@/components/ui/button';
import {
  getDemoCustomerById,
  getDemoMessagesByCustomerId,
  getDemoPhotosByCustomerId,
  getDemoQuotesByCustomerId,
  getDemoInvoicesByCustomerId,
} from '@/lib/demo/demo-data';
import {
  buildDemoInvoicesHref,
  buildDemoNewInvoicePath,
  buildDemoNewQuotePath,
  buildDemoQuotesHref,
  getDemoInvoicePath,
  getDemoQuotePath,
} from '@/lib/demo-paths';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatCents } from '@/lib/utils/format-currency';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';

interface DemoCustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoCustomerDetailPage({
  params,
}: DemoCustomerDetailPageProps) {
  const { id } = await params;

  const customer = getDemoCustomerById(id);
  if (!customer) {
    notFound();
  }

  const messages = getDemoMessagesByCustomerId(id);
  const photos = getDemoPhotosByCustomerId(id);
  const quotes = getDemoQuotesByCustomerId(id);
  const invoices = getDemoInvoicesByCustomerId(id);

  const displayName = customer.name || formatPhoneNumber(customer.phone_number);

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/demo/customers"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-2xl font-bold">{displayName}</h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex">
          <Button asChild className="w-full sm:w-auto">
            <Link href={buildDemoNewQuotePath({ customer: id })}>
              <Plus className="mr-2 h-4 w-4" />
              Quote
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href={buildDemoNewInvoicePath({ customer: id })}>
              <Plus className="mr-2 h-4 w-4" />
              Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{formatPhoneNumber(customer.phone_number)}</span>
          </div>

          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
          )}

          {customer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.address}</span>
            </div>
          )}

          {customer.unit_info && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span>{customer.unit_info}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Conversation</h2>
        <DemoConversationPanel
          customerId={id}
          initialMessages={messages}
          initialStage={customer.conversation_stage}
        />
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Photos &amp; Media</h2>
        <DemoPhotoGallery photos={photos} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Documents (Simulated)</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href={buildDemoQuotesHref({ customer: id })} className="hover:text-foreground hover:underline">
              Quotes ({quotes.length})
            </Link>
            <span>•</span>
            <Link
              href={buildDemoInvoicesHref({ customer: id })}
              className="hover:text-foreground hover:underline"
            >
              Invoices ({invoices.length})
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Recent Quotes</h3>
            {quotes.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No quotes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {quotes.slice(0, 3).map((quote) => (
                  <Link
                    key={quote.id}
                    href={getDemoQuotePath(quote.id)}
                    className="block rounded-md border bg-background/40 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{quote.short_ref}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {quote.description}
                        </p>
                        <p className="text-xs text-muted-foreground">{quote.status}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatCents(quote.total_cents)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Recent Invoices</h3>
            {invoices.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No invoices yet.
              </p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 3).map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={getDemoInvoicePath(invoice.id)}
                    className="block rounded-md border bg-background/40 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{formatInvoiceShortRef(invoice.id)}</p>
                        <p className="text-xs text-muted-foreground">{invoice.status}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatCents(invoice.amount_cents)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
