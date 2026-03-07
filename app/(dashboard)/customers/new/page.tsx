import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewCustomerForm } from './new-customer-form';

/**
 * New Customer Page
 *
 * Allows an admin to manually add a customer to the system.
 * Useful when a customer calls instead of texts, or for
 * adding existing customers to the system.
 */
export default function NewCustomerPage() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link
          href="/customers"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to customers"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">New Customer</h1>
          <p className="text-sm text-muted-foreground">
            Add a customer manually
          </p>
        </div>
      </div>

      <NewCustomerForm />
    </div>
  );
}
