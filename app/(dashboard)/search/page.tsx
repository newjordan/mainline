import { Suspense } from 'react';
import { SearchInput } from '@/components/search/search-input';
import { SearchResults } from '@/components/search/search-results';
import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// Global Search Page
// =============================================================================
// Searches across customers, quotes, invoices, and messages.
// =============================================================================

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = q ?? '';

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Search</h1>

      {/* Client component for input with debounce */}
      <Suspense fallback={<SearchInputSkeleton />}>
        <SearchInput />
      </Suspense>

      {/* Server component for results */}
      <Suspense key={query} fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Loading Skeletons
// =============================================================================

function SearchInputSkeleton() {
  return <Skeleton className="mb-6 h-12 w-full" />;
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Section skeleton */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
