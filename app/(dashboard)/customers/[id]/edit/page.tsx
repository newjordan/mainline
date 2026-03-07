import { notFound } from 'next/navigation';
import { getCustomer } from '@/lib/actions/customers';
import { CustomerEditForm } from './customer-edit-form';

interface CustomerEditPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Customer Edit Page
 *
 * Server Component wrapper that fetches customer data
 * and renders the client-side edit form.
 */
export default async function CustomerEditPage({
  params,
}: CustomerEditPageProps) {
  const { id } = await params;

  const result = await getCustomer(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <CustomerEditForm customer={result.data} />;
}
