import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildDemoCustomersHref } from '@/lib/demo-paths';

export default function DemoNewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link
          href={buildDemoCustomersHref()}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to customers"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">New Customer</h1>
          <p className="text-sm text-muted-foreground">Add a customer manually</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="phone_number">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            value="(512) 555-0198"
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            US phone numbers only. Any format accepted.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value="jamie@northyard.example"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" type="text" value="Jamie Carter" readOnly />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Primary Billing Address</Label>
          <Input
            id="address"
            name="address"
            type="text"
            value="415 Mason Rd, Sample City, TX 78702"
            readOnly
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Additional Addresses</Label>
            <Button type="button" variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Address
            </Button>
          </div>

          <Input value="Warehouse annex, 418 Mason Rd, Sample City, TX 78702" readOnly />

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove additional address 1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit_info">Unit Info</Label>
          <Input
            id="unit_info"
            name="unit_info"
            type="text"
            value="Roof package unit above suite B, keypad access at side gate."
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Equipment or service details (model numbers, locations, access notes, etc.)
          </p>
        </div>

        <Button type="button" className="w-full" size="lg">
          Create Customer
        </Button>
      </div>
    </div>
  );
}
