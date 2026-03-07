'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { Customer } from '@/lib/database.types';
import { updateCustomer } from '@/lib/actions/customers';
import { formatPhoneNumber } from '@/lib/utils/format-phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Zod schema for customer update validation
const customerUpdateSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(320, 'Email must be 320 characters or less')
    .nullable(),
  name: z.string().max(100, 'Name must be 100 characters or less').nullable(),
  address: z.string().max(500, 'Address must be 500 characters or less').nullable(),
  additional_addresses: z
    .array(z.string().max(500, 'Address must be 500 characters or less'))
    .max(25, 'Maximum 25 additional addresses'),
  unit_info: z.string().max(500, 'Unit info must be 500 characters or less').nullable(),
});

interface CustomerEditFormProps {
  customer: Customer;
}

/**
 * Customer Edit Form
 *
 * Client component for editing customer info.
 * Phone number displayed as read-only (identity field).
 */
export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(customer.name || '');
  const [email, setEmail] = useState(customer.email || '');
  const [address, setAddress] = useState(customer.address || '');
  const [additionalAddresses, setAdditionalAddresses] = useState<string[]>(
    customer.additional_addresses || []
  );
  const [unitInfo, setUnitInfo] = useState(customer.unit_info || '');

  function addAdditionalAddress() {
    setAdditionalAddresses((prev) => [...prev, '']);
  }

  function removeAdditionalAddress(index: number) {
    setAdditionalAddresses((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAdditionalAddress(index: number, value: string) {
    setAdditionalAddresses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const normalizedAdditionalAddresses = additionalAddresses
      .map((value) => value.trim())
      .filter(Boolean);

    // Prepare data
    const formData = {
      email: email.trim() || null,
      name: name.trim() || null,
      address: address.trim() || null,
      additional_addresses: normalizedAdditionalAddresses,
      unit_info: unitInfo.trim() || null,
    };

    // Validate with Zod
    const validation = customerUpdateSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Invalid input');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await updateCustomer(customer.id, validation.data);

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      toast.success('Customer changes saved');
      setIsSubmitting(false);
      router.replace(`/customers/${customer.id}`);
      router.refresh();
    } catch {
      setError('Failed to save customer changes');
      setIsSubmitting(false);
    }
  }

  const displayName =
    customer.name || formatPhoneNumber(customer.phone_number);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/customers/${customer.id}`}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to customer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 truncate text-2xl font-bold">Edit {displayName}</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phone (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formatPhoneNumber(customer.phone_number)}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Phone number cannot be changed (customer identity)
          </p>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer name"
            maxLength={100}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            maxLength={320}
            autoComplete="email"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Primary Billing Address</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Primary billing address"
            maxLength={500}
          />
        </div>

        {/* Additional Addresses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Additional Addresses</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAdditionalAddress}
              disabled={isSubmitting || additionalAddresses.length >= 25}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Address
            </Button>
          </div>

          {additionalAddresses.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add secondary property or service addresses for this customer.
            </p>
          )}

          <div className="space-y-2">
            {additionalAddresses.map((additionalAddress, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={additionalAddress}
                  onChange={(e) =>
                    updateAdditionalAddress(index, e.target.value)
                  }
                  placeholder={`Additional address ${index + 1}`}
                  maxLength={500}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeAdditionalAddress(index)}
                  disabled={isSubmitting}
                  aria-label={`Remove additional address ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Unit Info */}
        <div className="space-y-2">
          <Label htmlFor="unitInfo">Unit Info</Label>
          <Input
            id="unitInfo"
            value={unitInfo}
            onChange={(e) => setUnitInfo(e.target.value)}
            placeholder="e.g., fixture model, serial, install year"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            Equipment or service details (model, age, location, notes).
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
            <Link href={`/customers/${customer.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
