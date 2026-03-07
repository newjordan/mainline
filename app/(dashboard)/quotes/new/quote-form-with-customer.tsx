'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createQuote } from '@/lib/actions/quotes';
import { formatCents } from '@/lib/utils/format-currency';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import type { Customer } from '@/lib/database.types';
import { Input } from '@/components/ui/input';

interface LineItem {
  description: string;
  amount_input: string;
}

interface QuoteFormWithCustomerSelectProps {
  customers: Customer[];
  preselectedCustomer: Customer | null;
}

function getCustomerAddressOptions(customer: Customer | null): string[] {
  if (!customer) return [];

  const seen = new Set<string>();
  const options: string[] = [];

  const pushAddress = (raw: string | null | undefined) => {
    if (!raw) return;
    const value = raw.trim();
    if (!value) return;

    const key = value.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    options.push(value);
  };

  pushAddress(customer.address);
  for (const address of customer.additional_addresses || []) {
    pushAddress(address);
  }

  return options;
}

/**
 * Quote Form with Customer Selection
 *
 * Allows creating a quote with:
 * - Customer dropdown (if not preselected)
 * - Dynamic line items
 * - Auto-calculated total
 * - Save as draft or finalize for review
 */
export function QuoteFormWithCustomerSelect({
  customers,
  preselectedCustomer,
}: QuoteFormWithCustomerSelectProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer?.id || ''
  );
  const [customerSearch, setCustomerSearch] = useState('');
  const [description, setDescription] = useState('');
  const [selectedServiceAddress, setSelectedServiceAddress] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount_input: '' },
  ]);

  const parseAmountToCents = (value: string): number => {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100);
  };

  const sanitizeAmountInput = (value: string): string => {
    let sanitized = '';
    let hasDot = false;
    let decimalCount = 0;

    for (const char of value) {
      if (char === '-' && sanitized.length === 0) {
        sanitized += char;
        continue;
      }

      if (char >= '0' && char <= '9') {
        if (hasDot) {
          if (decimalCount >= 2) continue;
          decimalCount += 1;
        }
        sanitized += char;
      } else if (char === '.' && !hasDot) {
        hasDot = true;
        sanitized += char;
      }
    }

    return sanitized;
  };

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) return customers;

    return customers.filter((customer) => {
      const searchFields = [
        customer.name || '',
        customer.phone_number,
        formatPhoneNumber(customer.phone_number),
        customer.address || '',
        ...(customer.additional_addresses || []),
      ];

      return searchFields.some((field) =>
        field.toLowerCase().includes(search)
      );
    });
  }, [customerSearch, customers]);

  const visibleCustomers = useMemo(() => {
    if (!selectedCustomerId) return filteredCustomers;
    if (filteredCustomers.some((customer) => customer.id === selectedCustomerId)) {
      return filteredCustomers;
    }

    const selected = customers.find((customer) => customer.id === selectedCustomerId);
    return selected ? [selected, ...filteredCustomers] : filteredCustomers;
  }, [customers, filteredCustomers, selectedCustomerId]);

  const selectedCustomer =
    preselectedCustomer ||
    customers.find((customer) => customer.id === selectedCustomerId) ||
    null;
  const customerAddressOptions = useMemo(
    () => getCustomerAddressOptions(selectedCustomer),
    [selectedCustomer]
  );

  useEffect(() => {
    setSelectedServiceAddress((current) => {
      if (customerAddressOptions.length === 0) return '';
      if (current && customerAddressOptions.includes(current)) return current;
      return customerAddressOptions[0];
    });
  }, [customerAddressOptions]);

  const totalCents = lineItems.reduce(
    (sum, item) => sum + parseAmountToCents(item.amount_input),
    0
  );

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount_input: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updated = [...lineItems];
    if (field === 'amount_input') {
      updated[index].amount_input = sanitizeAmountInput(value as string);
    } else {
      updated[index].description = value as string;
    }
    setLineItems(updated);
  };

  const handleSubmit = async (asDraft: boolean) => {
    // Validate customer
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    // Validate description
    if (!description.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (customerAddressOptions.length > 1 && !selectedServiceAddress) {
      toast.error('Please select a service address');
      return;
    }

    const validLineItems = lineItems
      .map((item) => ({
        description: item.description.trim(),
        amount_cents: parseAmountToCents(item.amount_input),
      }))
      .filter((item) => item.description && item.amount_cents !== 0);

    if (validLineItems.length === 0) {
      toast.error('Please add at least one line item with description and non-zero amount');
      return;
    }

    const total = validLineItems.reduce((sum, item) => sum + item.amount_cents, 0);
    if (total <= 0) {
      toast.error('Quote total must be greater than $0.00');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createQuote({
        customer_id: selectedCustomerId,
        description: description.trim(),
        service_address:
          selectedServiceAddress || customerAddressOptions[0] || undefined,
        line_items: validLineItems,
        total_cents: total,
        // Sending is a separate explicit action on the quote detail page.
        status: 'draft',
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create quote');
        return;
      }

      toast.success(
        asDraft
          ? 'Draft saved'
          : 'Quote finalized. Send it from the quote screen.'
      );
      router.push(`/quotes/${result.data.id}`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      {!preselectedCustomer && (
        <div>
          <label
            htmlFor="customer-search"
            className="mb-2 block text-sm font-medium"
          >
            Search Customers
          </label>
          <Input
            id="customer-search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search by name, phone, or address..."
            className="mb-3"
            disabled={isSubmitting}
          />

          <label
            htmlFor="customer"
            className="mb-2 block text-sm font-medium"
          >
            Customer <span className="text-destructive">*</span>
          </label>
          <select
            id="customer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          >
            <option value="">Select a customer...</option>
            {visibleCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name || formatPhoneNumber(customer.phone_number)}
                {customer.name && ` (${formatPhoneNumber(customer.phone_number)})`}
              </option>
            ))}
          </select>
          {filteredCustomers.length === 0 && customers.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No matching customers found.
            </p>
          )}
          {customers.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No customers yet. Create a customer first.
            </p>
          )}
        </div>
      )}

      {/* Selected Customer Info (read-only) */}
      {selectedCustomer && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Quote for:</p>
          <p className="font-semibold">
            {selectedCustomer.name || formatPhoneNumber(selectedCustomer.phone_number)}
          </p>
          {selectedCustomer.address && (
            <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
          )}
        </div>
      )}

      {/* Job Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium"
        >
          Job Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the work to be done..."
          className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />
      </div>

      {/* Service Address Selection */}
      {selectedCustomer && customerAddressOptions.length > 1 && (
        <div>
          <label
            htmlFor="service-address"
            className="mb-2 block text-sm font-medium"
          >
            Service Address <span className="text-destructive">*</span>
          </label>
          <select
            id="service-address"
            value={selectedServiceAddress}
            onChange={(e) => setSelectedServiceAddress(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          >
            {customerAddressOptions.map((address) => (
              <option key={address} value={address}>
                {address}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Line Items */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          Line Items <span className="text-destructive">*</span>
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Use a negative amount for discounts (example: -25.00).
        </p>
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateLineItem(index, 'description', e.target.value)
                }
                placeholder="Item description"
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
              />
              <div className="relative w-24 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="text"
                  inputMode="text"
                  value={item.amount_input}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    updateLineItem(index, 'amount_input', e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-left text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                disabled={lineItems.length === 1 || isSubmitting}
                aria-label="Remove line item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLineItem}
          className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent/10"
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4" />
          Add Line Item
        </button>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="font-medium">Total</span>
        <span className="text-2xl font-bold">{formatCents(totalCents)}</span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full rounded-lg border px-4 py-3 text-sm font-medium hover:bg-accent/10"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          className="w-full rounded-lg border px-4 py-3 text-sm font-medium hover:bg-accent/10"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            'Save Draft'
          )}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            'Finalize Quote'
          )}
        </button>
      </div>
    </div>
  );
}
