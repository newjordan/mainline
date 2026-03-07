import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { validateQuoteToken } from '@/lib/utils/quote-tokens';
import { logQuoteEvent } from '@/lib/utils/audit-log';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import type { QuoteLineItem } from '@/lib/database.types';
import { PrintButton } from '@/components/quotes/print-button';
import { getPublicContactConfig } from '@/lib/config/contact';
import { getBusinessProfile } from '@/lib/config/business-profile';

interface PublicQuotePageProps {
  params: Promise<{ token: string }>;
}

const businessProfile = getBusinessProfile();

export async function generateMetadata({
  params,
}: PublicQuotePageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await validateQuoteToken(token);

  if (!result.success || !result.data) {
    return { title: `Quote Not Found | ${businessProfile.companyName}` };
  }

  const { quote } = result.data;

  return {
    title: `Quote ${quote.short_ref} - ${formatCents(quote.total_cents)} | ${businessProfile.companyName}`,
    description: `${businessProfile.industryDescription} quote from ${businessProfile.companyName} - ${quote.description.slice(0, 100)}`,
    // Prevent indexing of quote pages
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Public Quote View Page (Token-Based Access)
 *
 * Security features:
 * - 64-character cryptographic token required (not guessable UUID)
 * - Token expiration (30 days default)
 * - Token revocation when quote is superseded
 * - Audit logging of all views
 *
 * No authentication required - token IS the authentication.
 */
export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { token } = await params;

  // Validate token and get quote
  const tokenResult = await validateQuoteToken(token);

  if (!tokenResult.success || !tokenResult.data) {
    notFound();
  }

  const { quote, customerId } = tokenResult.data;

  // Log the view event (fire and forget)
  logQuoteEvent(quote.id, 'viewed', 'customer', customerId, {
    token_prefix: token.slice(0, 8) + '...',
    short_ref: quote.short_ref,
  }).catch(() => {});

  // Fetch customer info directly (public page — no auth session available)
  const supabase = createServiceRoleClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', quote.customer_id)
    .single();
  const serviceAddress =
    quote.service_address?.trim() || customer?.address?.trim() || null;

  const lineItems = (quote.line_items as QuoteLineItem[]) || [];
  const formattedDate = new Date(quote.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Quote valid for 30 days
  const validUntil = new Date(quote.created_at);
  validUntil.setDate(validUntil.getDate() + 30);
  const formattedValidUntil = validUntil.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { smsPhoneE164: businessPhone } = getPublicContactConfig();

  // Check if quote has been superseded
  const isSuperseded = !!quote.superseded_at;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      <main className="min-h-screen bg-slate-50 px-4 py-6 text-gray-900 print:bg-white print:p-0">
        <div className="mx-auto max-w-2xl">
          {/* Superseded Warning */}
          {isSuperseded && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="font-medium text-amber-800">
                This quote has been replaced by a newer version.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Please check your messages for an updated quote.
              </p>
            </div>
          )}

          {/* Quote Card */}
          <div className="overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none">
            {/* Header with Logo */}
            <div className="border-b border-slate-100 bg-slate-800 px-6 py-6 text-white print:bg-white print:text-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={businessProfile.assets.logoIconSrc}
                    alt={businessProfile.companyName}
                    width={48}
                    height={48}
                    className="h-12 w-12 print:h-10 print:w-10"
                  />
                  <div>
                    <h1 className="text-xl font-bold">{businessProfile.companyName}</h1>
                    <p className="text-sm text-slate-300 print:text-slate-600">
                      {businessProfile.industryDescription}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">QUOTE</div>
                  <div className="text-sm font-medium text-slate-200 print:text-slate-700">
                    {quote.short_ref}
                  </div>
                  <div className="text-sm text-slate-300 print:text-slate-600">
                    {formattedDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Status */}
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Prepared For
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {customer?.name || 'Customer'}
                  </p>
                  {customer?.phone_number && (
                    <p className="text-sm text-slate-600">
                      {formatPhoneNumber(customer.phone_number)}
                    </p>
                  )}
                  {serviceAddress && (
                    <p className="mt-1 text-sm text-slate-600">{serviceAddress}</p>
                  )}
                </div>

                {/* Status Badge */}
                <div className="print-break">
                  {isSuperseded ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                      Superseded
                    </span>
                  ) : (
                    <>
                      {quote.status === 'sent' && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                          Awaiting Response
                        </span>
                      )}
                      {quote.status === 'accepted' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          Accepted
                        </span>
                      )}
                      {quote.status === 'rejected' && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                          Declined
                        </span>
                      )}
                      {quote.status === 'draft' && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                          Draft
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="border-b border-slate-100 px-6 py-5 print-break">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Scope of Work
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">
                {quote.description}
              </p>
            </div>

            {/* Line Items */}
            <div className="px-6 py-5 print-break">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Itemized Estimate
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-slate-700">
                          {item.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                          {formatCents(item.amount_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white">
                      <td className="px-4 py-4 text-lg font-semibold">Total</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-2xl font-bold">
                        {formatCents(quote.total_cents)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Acceptance Section - Only show for sent, non-superseded quotes with confirmation code */}
            {quote.status === 'sent' && !isSuperseded && quote.confirmation_code && (
              <div className="mx-6 mb-6 rounded-lg bg-blue-50 p-5 text-center no-print">
                <p className="text-lg font-semibold text-blue-900">
                  Ready to proceed?
                </p>
                <p className="mt-2 text-blue-800">
                  Reply to the text message with:
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  YES {quote.confirmation_code}
                </p>
              </div>
            )}

            {quote.status === 'accepted' && (
              <div className="mx-6 mb-6 rounded-lg bg-green-50 p-5 text-center">
                <p className="text-lg font-semibold text-green-900">
                  Quote Accepted
                </p>
                <p className="mt-1 text-green-800">
                  {quote.accepted_at
                    ? `Accepted on ${new Date(quote.accepted_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}`
                    : "We'll be in touch to schedule your service."}
                </p>
              </div>
            )}

            {/* Terms */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 print-break">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Terms
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>Quote valid until {formattedValidUntil}</li>
                <li>Payment due upon completion</li>
                <li>Price includes parts and labor unless otherwise noted</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-white px-6 py-5 text-center">
              <p className="font-semibold text-slate-800">{businessProfile.companyName}</p>
              <p className="text-sm text-slate-600">
                {businessProfile.serviceArea.label} &bull; {businessProfile.industryDescription}
              </p>
              {businessPhone && (
                <p className="mt-1 text-sm text-slate-600">
                  {formatPhoneNumber(businessPhone)}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-400">
                {businessProfile.marketing.tagline}
              </p>
            </div>
          </div>

          {/* Print Button */}
          <div className="mt-6 text-center no-print">
            <PrintButton />
          </div>
        </div>
      </main>
    </>
  );
}
