import { Skeleton } from '@/components/ui/skeleton';

/**
 * Customer List Loading State
 *
 * Shows skeleton cards while customers are loading.
 */
export default function CustomersLoading() {
  return (
    <div className="p-4">
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border bg-card p-4"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
