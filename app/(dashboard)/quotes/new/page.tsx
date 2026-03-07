import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCustomer, getCustomers } from '@/lib/actions/customers';
import { QuoteFormWithCustomerSelect } from './quote-form-with-customer';

type SearchParams = Promise<{ customer?: string }>;

/**
 * New Quote Page
 *
 * Creates a new quote. Supports two modes:
 * 1. With ?customer=<id> - Pre-selects the customer
 * 2. Without customer param - Shows customer dropdown
 */
export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { customer: customerId } = await searchParams;

  // Fetch all customers for dropdown
  const customersResult = await getCustomers();
  const customers = customersResult.success ? customersResult.data : [];

  // If customer ID provided, fetch that customer
  let preselectedCustomer = null;
  if (customerId) {
    const result = await getCustomer(customerId);
    if (result.success && result.data) {
      preselectedCustomer = result.data;
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link
          href={preselectedCustomer ? `/customers/${customerId}` : '/quotes'}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">New Quote</h1>
          {preselectedCustomer && (
            <p className="truncate text-sm text-muted-foreground">
              for {preselectedCustomer.name || preselectedCustomer.phone_number}
            </p>
          )}
        </div>
      </div>

      {/* Quote Form with Customer Selection */}
      <QuoteFormWithCustomerSelect
        customers={customers}
        preselectedCustomer={preselectedCustomer}
      />
    </div>
  );
}
