'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCustomerManual } from '@/lib/actions/customers';
import { toast } from 'sonner';

/**
 * New Customer Form
 *
 * Client component for creating a new customer.
 * Phone number is required, other fields are optional.
 */
export function NewCustomerForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [additionalAddresses, setAdditionalAddresses] = useState<string[]>([]);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const input = {
      phone_number: formData.get('phone_number') as string,
      email: (formData.get('email') as string) || undefined,
      name: (formData.get('name') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      additional_addresses: additionalAddresses
        .map((value) => value.trim())
        .filter(Boolean),
      unit_info: (formData.get('unit_info') as string) || undefined,
    };

    const result = await createCustomerManual(input);

    if (result.success) {
      toast.success('Customer created');
      router.push(`/customers/${result.data.id}`);
    } else {
      toast.error(result.error || 'Failed to create customer');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Phone Number - Required */}
      <div className="space-y-2">
        <Label htmlFor="phone_number">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone_number"
          name="phone_number"
          type="tel"
          placeholder="(555) 123-4567"
          required
          autoFocus
          autoComplete="tel"
        />
        <p className="text-xs text-muted-foreground">
          US phone numbers only. Any format accepted.
        </p>
      </div>

      {/* Email - Optional */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="customer@example.com"
          autoComplete="email"
        />
      </div>

      {/* Name - Optional */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="John Smith"
          autoComplete="name"
        />
      </div>

      {/* Address - Optional */}
      <div className="space-y-2">
        <Label htmlFor="address">Primary Billing Address</Label>
        <Input
          id="address"
          name="address"
          type="text"
          placeholder="123 Main St, Springfield, IL 62701"
          autoComplete="street-address"
        />
      </div>

      {/* Additional Addresses - Optional */}
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
            Add secondary property or service addresses as needed.
          </p>
        )}

        <div className="space-y-2">
          {additionalAddresses.map((address, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={address}
                onChange={(e) => updateAdditionalAddress(index, e.target.value)}
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

      {/* Unit Info - Optional */}
      <div className="space-y-2">
        <Label htmlFor="unit_info">Unit Info</Label>
        <Input
          id="unit_info"
          name="unit_info"
          type="text"
          placeholder="Equipment/model details, install year, notes"
        />
        <p className="text-xs text-muted-foreground">
          Equipment or service details (model numbers, locations, access notes, etc.)
        </p>
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Customer'}
      </Button>
    </form>
  );
}
