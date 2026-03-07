import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Wrench, Plus } from 'lucide-react';
import { getCustomer } from '@/lib/actions/customers';
import { getCustomerPhotos } from '@/lib/actions/customer-photos';
import { getMessages } from '@/lib/actions/messages';
import { getCustomerQuotes } from '@/lib/actions/quotes';
import { getCustomerInvoices } from '@/lib/actions/invoices';
import { ConversationSection } from './conversation-section';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { formatCents } from '@/lib/utils/format-currency';
import { formatInvoiceShortRef } from '@/lib/utils/invoice-reference';
import { Button } from '@/components/ui/button';
import { CustomerPhotoGallery, type CustomerPhoto } from '@/components/customers/customer-photo-gallery';
import { RequestReviewButton } from '@/components/customers/request-review-button';
import { getCustomerMediaRef, normalizeMediaReference } from '@/lib/services/customer-media';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

function getQuoteDisplayStatus(quote: {
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  completed_at: string | null;
  archived_at: string | null;
}): string {
  if (quote.archived_at) return 'archived';
  if (quote.completed_at) return 'completed';
  return quote.status;
}

function getInvoiceDisplayStatus(invoice: {
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  completed_at: string | null;
  archived_at: string | null;
}): string {
  if (invoice.archived_at) return 'archived';
  if (invoice.completed_at) return 'completed';
  return invoice.status;
}

/**
 * Customer Detail Page
 *
 * Shows customer info, conversation history with composer,
 * and links to quotes/invoices.
 */
export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;

  // Fetch customer and messages in parallel
  const [
    customerResult,
    messagesResult,
    savedPhotosResult,
    quotesResult,
    invoicesResult,
  ] = await Promise.all([
    getCustomer(id),
    getMessages(id),
    getCustomerPhotos(id),
    getCustomerQuotes(id),
    getCustomerInvoices(id),
  ]);

  if (!customerResult.success || !customerResult.data) {
    notFound();
  }

  const customer = customerResult.data;
  const additionalAddresses = (customer.additional_addresses || []).filter(
    (address) => address.trim().length > 0
  );
  const messages = messagesResult.success ? messagesResult.data : [];
  const savedPhotos = savedPhotosResult.success ? savedPhotosResult.data : [];
  const messagePhotos: CustomerPhoto[] = messages.flatMap((message) => {
    if (!Array.isArray(message.media_urls)) return [];

    return message.media_urls.map((url, index) => ({
      id: `message-${message.id}-${index}`,
      url,
      sendRef: normalizeMediaReference(url),
      created_at: message.created_at,
      direction: message.direction,
      source: 'message' as const,
    }));
  });
  const uploadedPhotos: CustomerPhoto[] = savedPhotos.map((photo) => ({
    id: `saved-${photo.id}`,
    url: photo.url,
    sendRef: getCustomerMediaRef(photo.file_path),
    created_at: photo.created_at,
    direction: null,
    source: 'saved' as const,
  }));
  const photosByRef = new Map<string, CustomerPhoto>();

  for (const photo of [...uploadedPhotos, ...messagePhotos]) {
    if (!photosByRef.has(photo.sendRef)) {
      photosByRef.set(photo.sendRef, photo);
    }
  }

  const photos = Array.from(photosByRef.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const quotes = quotesResult.success ? quotesResult.data : [];
  const invoices = invoicesResult.success ? invoicesResult.data : [];
  const quoteCount = quotes.length;
  const invoiceCount = invoices.length;
  const recentQuotes = quotes.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  const displayName = customer.name || formatPhoneNumber(customer.phone_number);

  return (
    <div className="mx-auto max-w-4xl p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/customers"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-2xl font-bold">{displayName}</h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex">
          <Button variant="default" size="sm" asChild className="w-full sm:w-auto">
            <Link href={`/quotes/new?customer=${id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Quote
            </Link>
          </Button>
          <RequestReviewButton customerId={id} />
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link href={`/customers/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{formatPhoneNumber(customer.phone_number)}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${customer.email}`} className="hover:underline">
                {customer.email}
              </a>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Primary Billing
                </p>
                <span>{customer.address}</span>
              </div>
            </div>
          )}
          {additionalAddresses.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Additional Addresses
                </p>
                <ul className="mt-1 space-y-1">
                  {additionalAddresses.map((address, index) => (
                    <li key={`${address}-${index}`}>{address}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {customer.unit_info && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span>{customer.unit_info}</span>
            </div>
          )}
          {!customer.address &&
            additionalAddresses.length === 0 &&
            !customer.unit_info &&
            !customer.name && (
            <p className="text-sm text-muted-foreground">
              No additional info yet. Click Edit to add details.
            </p>
          )}
        </div>
      </div>

      {/* Conversation with Composer */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Conversation</h2>
        <ConversationSection
          customerId={id}
          initialMessages={messages}
          conversationStage={customer.conversation_stage}
        />
      </div>

      {/* Customer Photos */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Photos</h2>
        <CustomerPhotoGallery customerId={id} photos={photos} />
      </div>

      {/* Quotes & Invoices */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Documents</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Link
              href={`/quotes?customer=${id}`}
              className="hover:text-foreground hover:underline"
            >
              Quotes ({quoteCount})
            </Link>
            <span>•</span>
            <Link
              href={`/invoices?customer=${id}`}
              className="hover:text-foreground hover:underline"
            >
              Invoices ({invoiceCount})
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Recent Quotes
            </h3>
            {recentQuotes.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No quotes yet for this customer.
              </p>
            ) : (
              <div className="space-y-2">
                {recentQuotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    className="block rounded-md border bg-background/40 p-3 hover:bg-accent/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{quote.short_ref}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {quote.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(quote.created_at).toLocaleDateString()} •{' '}
                          {getQuoteDisplayStatus(quote)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCents(quote.total_cents)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Recent Invoices
            </h3>
            {recentInvoices.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No invoices yet for this customer.
              </p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="block rounded-md border bg-background/40 p-3 hover:bg-accent/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {formatInvoiceShortRef(invoice.id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.created_at).toLocaleDateString()} •{' '}
                          {getInvoiceDisplayStatus(invoice)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCents(invoice.amount_cents)}
                      </p>
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
