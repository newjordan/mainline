'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

// =============================================================================
// Search Input Component
// =============================================================================
// Client component with debounced search that syncs with URL query params.
// =============================================================================

/**
 * Custom debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const debouncedQuery = useDebounce(query, 300);

  // Sync debounced query to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedQuery) {
      params.set('q', debouncedQuery);
    } else {
      params.delete('q');
    }

    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(newUrl);
  }, [debouncedQuery, router, searchParams]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search customers, quotes, invoices, messages..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 pl-10 pr-10 text-base"
        autoFocus
        autoComplete="off"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
