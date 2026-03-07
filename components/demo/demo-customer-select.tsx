'use client';

import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import type { DemoCustomer } from '@/lib/demo/demo-data';
import { formatPhoneNumber } from '@/lib/utils/format-phone';

const ADD_NEW_CUSTOMER_VALUE = '__add_new_customer__';

function buildCustomerSelectionHref(
  basePath: string,
  customerId: string,
  extraParams: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  if (customerId) search.set('customer', customerId);

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) search.set(key, value);
  }

  const serialized = search.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

interface DemoCustomerSelectProps {
  customers: DemoCustomer[];
  selectedCustomerId: string | null | undefined;
  basePath: string;
  addNewHref: string;
  title?: string;
  description?: string;
  extraParams?: Record<string, string | undefined>;
}

export function DemoCustomerSelect({
  customers,
  selectedCustomerId,
  basePath,
  addNewHref,
  title = 'Customer',
  description,
  extraParams = {},
}: DemoCustomerSelectProps) {
  const router = useRouter();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;

    if (nextValue === ADD_NEW_CUSTOMER_VALUE) {
      router.push(addNewHref);
      return;
    }

    router.push(buildCustomerSelectionHref(basePath, nextValue, extraParams));
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <label htmlFor="demo-customer-select" className="mb-2 block text-sm font-medium">
        {title}
      </label>
      {description && <p className="mb-3 text-xs text-muted-foreground">{description}</p>}

      <select
        id="demo-customer-select"
        value={selectedCustomerId ?? ''}
        onChange={handleChange}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Select a customer...</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name || formatPhoneNumber(customer.phone_number)}
            {customer.name && ` (${formatPhoneNumber(customer.phone_number)})`}
          </option>
        ))}
        <option value={ADD_NEW_CUSTOMER_VALUE}>Add new customer...</option>
      </select>

      <p className="mt-2 text-xs text-muted-foreground">
        Choose a demo customer, or select “Add new customer...” to open the demo create flow.
      </p>
    </div>
  );
}