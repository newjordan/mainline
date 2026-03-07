import { Skeleton } from '@/components/ui/skeleton';

/**
 * Quotes List Loading State
 */
export default function QuotesLoading() {
  return (
    <div className="p-4">
      <div className="mb-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-4 w-20" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
            <div className="text-right">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="mt-2 h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
