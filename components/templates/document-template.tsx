import Image from 'next/image';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { getBusinessProfile } from '@/lib/config/business-profile';

export interface LineItem {
  description: string;
  amount_cents: number;
}

export interface DocumentTemplateProps {
  /** Document type - affects header styling and terminology */
  type: 'quote' | 'invoice';
  /** Document date */
  date: Date;
  /** Customer name */
  customerName: string;
  /** Customer phone (optional) */
  customerPhone?: string;
  /** Customer address (optional) */
  customerAddress?: string;
  /** Job/work description */
  description: string;
  /** Line items with descriptions and amounts */
  lineItems: LineItem[];
  /** Total amount in cents */
  totalCents: number;
  /** Document status */
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue';
  /** Status date (e.g., accepted_at, paid_at) */
  statusDate?: Date;
  /** Valid until date (for quotes) */
  validUntil?: Date;
  /** Due date (for invoices) */
  dueDate?: Date;
  /** Invoice number (for invoices) */
  invoiceNumber?: string;
  /** Business phone number */
  businessPhone?: string;
  /** Custom acceptance instructions */
  acceptanceInstructions?: React.ReactNode;
}

/**
 * DocumentTemplate Component
 *
 * Reusable template for professional quotes and invoices.
 * Features:
 * - Profile-driven branding with logo
 * - Professional layout with sections
 * - Status badges
 * - Itemized table with totals
 * - Terms section
 * - Print-friendly styles
 *
 * Can be used as:
 * - Web page (current)
 * - Print template (via browser print)
 * - Future: PDF generation backend
 */
export function DocumentTemplate({
  type,
  date,
  customerName,
  customerPhone,
  customerAddress,
  description,
  lineItems,
  totalCents,
  status,
  statusDate,
  validUntil,
  dueDate,
  invoiceNumber,
  businessPhone,
  acceptanceInstructions,
}: DocumentTemplateProps) {
  const businessProfile = getBusinessProfile();
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const typeLabel = type === 'quote' ? 'QUOTE' : 'INVOICE';
  const headerBgClass = type === 'quote' ? 'bg-slate-800' : 'bg-blue-900';
  const totalBgClass = type === 'quote' ? 'bg-slate-800' : 'bg-blue-900';

  // Status badge config
  const statusConfig = {
    draft: { label: 'Draft', bgClass: 'bg-slate-100', textClass: 'text-slate-600' },
    sent: { label: 'Awaiting Response', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
    accepted: { label: 'Accepted', bgClass: 'bg-green-100', textClass: 'text-green-800' },
    rejected: { label: 'Declined', bgClass: 'bg-red-100', textClass: 'text-red-800' },
    paid: { label: 'Paid', bgClass: 'bg-green-100', textClass: 'text-green-800' },
    overdue: { label: 'Overdue', bgClass: 'bg-red-100', textClass: 'text-red-800' },
  };

  const statusBadge = statusConfig[status];

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none">
      {/* Header with Logo */}
      <div className={`border-b border-slate-100 ${headerBgClass} px-6 py-6 text-white print:bg-white print:text-slate-800`}>
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
            <div className="text-2xl font-bold">{typeLabel}</div>
            {invoiceNumber && (
              <div className="text-sm text-slate-300 print:text-slate-600">
                #{invoiceNumber}
              </div>
            )}
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
              {type === 'quote' ? 'Prepared For' : 'Bill To'}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {customerName}
            </p>
            {customerPhone && (
              <p className="text-sm text-slate-600">
                {formatPhoneNumber(customerPhone)}
              </p>
            )}
            {customerAddress && (
              <p className="mt-1 text-sm text-slate-600">{customerAddress}</p>
            )}
          </div>

          {/* Status Badge */}
          <div className="print-break">
            <span className={`inline-flex items-center rounded-full ${statusBadge.bgClass} px-3 py-1 text-sm font-medium ${statusBadge.textClass}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Job Description */}
      <div className="border-b border-slate-100 px-6 py-5 print-break">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Scope of Work
        </p>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">
          {description}
        </p>
      </div>

      {/* Line Items */}
      <div className="px-6 py-5 print-break">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          {type === 'quote' ? 'Itemized Estimate' : 'Itemized Charges'}
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
              <tr className={`${totalBgClass} text-white`}>
                <td className="px-4 py-4 text-lg font-semibold">Total</td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-2xl font-bold">
                  {formatCents(totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Custom Acceptance/Action Section */}
      {acceptanceInstructions && (
        <div className="mx-6 mb-6 no-print">
          {acceptanceInstructions}
        </div>
      )}

      {/* Status Message */}
      {status === 'accepted' && statusDate && (
        <div className="mx-6 mb-6 rounded-lg bg-green-50 p-5 text-center">
          <p className="text-lg font-semibold text-green-900">
            {type === 'quote' ? 'Quote Accepted' : 'Invoice Paid'}
          </p>
          <p className="mt-1 text-green-800">
            {statusDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}

      {status === 'paid' && statusDate && (
        <div className="mx-6 mb-6 rounded-lg bg-green-50 p-5 text-center">
          <p className="text-lg font-semibold text-green-900">Payment Received</p>
          <p className="mt-1 text-green-800">
            Paid on {statusDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* Terms */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 print-break">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Terms
        </p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {type === 'quote' && validUntil && (
            <li>Quote valid until {validUntil.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</li>
          )}
          {type === 'invoice' && dueDate && (
            <li>Payment due by {dueDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</li>
          )}
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
  );
}
