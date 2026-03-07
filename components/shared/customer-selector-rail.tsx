'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface CustomerSelectorRailItem {
  id: string;
  label: string;
  subLabel?: string | null;
  count: number;
  href: string;
  isActive: boolean;
}

interface HiddenField {
  name: string;
  value: string | number;
}

interface CustomerSelectorRailProps {
  title?: string;
  basePath: string;
  searchPlaceholder: string;
  searchValue: string;
  hiddenFields?: HiddenField[];
  allHref: string;
  allCount: number;
  allActive: boolean;
  items: CustomerSelectorRailItem[];
}

/**
 * Searchable customer rail — collapses to a dropdown on mobile, sidebar on desktop.
 */
export function CustomerSelectorRail({
  title = 'Customers',
  basePath,
  searchPlaceholder,
  searchValue,
  hiddenFields = [],
  allHref,
  allCount,
  allActive,
  items,
}: CustomerSelectorRailProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = items.find((item) => item.isActive);
  const mobileLabel = activeItem
    ? activeItem.label
    : allActive
      ? `All customers (${allCount})`
      : title;

  const visibleItems = useMemo(() => [
    {
      id: 'all-customers',
      label: 'All customers',
      subLabel: null,
      count: allCount,
      href: allHref,
      isActive: allActive,
    },
    ...items,
  ], [allActive, allCount, allHref, items]);

  const focusLinkAt = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, visibleItems.length - 1));
    const target = linkRefs.current[clampedIndex];
    target?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End' &&
      event.key !== '/'
    ) {
      return;
    }

    if (event.key === '/') {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = linkRefs.current.findIndex((link) => link === activeElement);

    event.preventDefault();

    if (event.key === 'Home') {
      focusLinkAt(0);
      return;
    }

    if (event.key === 'End') {
      focusLinkAt(visibleItems.length - 1);
      return;
    }

    if (currentIndex < 0) {
      focusLinkAt(0);
      return;
    }

    if (event.key === 'ArrowDown') {
      focusLinkAt(currentIndex + 1);
      return;
    }

    focusLinkAt(currentIndex - 1);
  };

  const listContent = (
    <>
      <form action={basePath} className="mt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            name="q"
            type="search"
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            className="h-11 pl-9 text-base"
            autoComplete="off"
          />
        </div>

        {hiddenFields.map((field) => (
          <input
            key={field.name}
            type="hidden"
            name={field.name}
            value={String(field.value)}
          />
        ))}
      </form>

      <div
        className="mt-2 max-h-[60vh] space-y-1 overflow-auto pr-1"
        onKeyDown={handleKeyDown}
      >
        {visibleItems.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            ref={(element) => {
              linkRefs.current[index] = element;
            }}
            onClick={() => setMobileOpen(false)}
            className={`block rounded-md px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              item.isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted active:bg-muted'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.count}</span>
            </div>
            {item.subLabel && (
              <p className="truncate text-xs text-muted-foreground">{item.subLabel}</p>
            )}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: collapsible dropdown toggle */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-left active:bg-muted"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{mobileLabel}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {mobileOpen && (
          <div className="mt-2 rounded-lg border bg-card p-3">
            {listContent}
          </div>
        )}
      </div>

      {/* Desktop: always-visible sidebar */}
      <div className="hidden md:block rounded-lg border bg-card p-3">
        <p className="text-sm font-semibold">{title}</p>
        {listContent}
      </div>
    </>
  );
}
