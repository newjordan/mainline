import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dashboard Home Loading State
 *
 * Shows skeleton attention cards while data is loading.
 */
export default function HomeLoading() {
  return (
    <div className="p-4">
      <Skeleton className="mb-6 h-8 w-32" />

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border bg-card p-4"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
