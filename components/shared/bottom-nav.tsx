'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileText, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeCounts = {
  home?: number;
  customers?: number;
  quotes?: number;
  invoices?: number;
};

const navItems = [
  { href: '/home', icon: Home, label: 'Home', key: 'home' as const },
  { href: '/customers', icon: Users, label: 'Customers', key: 'customers' as const },
  { href: '/quotes', icon: FileText, label: 'Quotes', key: 'quotes' as const },
  { href: '/invoices', icon: Receipt, label: 'Invoices', key: 'invoices' as const },
];

/**
 * Bottom Navigation Component
 *
 * Mobile-first bottom navigation for dashboard.
 * - Fixed at viewport bottom with safe area padding
 * - 4 tabs: Home, Customers, Quotes, Invoices
 * - Active tab highlighted with primary color
 * - Badge counts for items needing attention
 * - 48px minimum tap targets for mobile
 */
export function BottomNav({ badges = {} }: { badges?: BadgeCounts }) {
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const useDemoLinks = currentPath.startsWith('/demo/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const resolvedHref = useDemoLinks ? `/demo${item.href}` : item.href;
          const demoHref = `/demo${item.href}`;

          // Home is exact match, others use startsWith for nested routes
          const isActive =
            item.href === '/home'
              ? currentPath === item.href || currentPath === demoHref
              : currentPath.startsWith(item.href) || currentPath.startsWith(demoHref);

          const badgeCount = badges[item.key] || 0;

          return (
            <Link
              key={item.href}
              href={resolvedHref}
              className={cn(
                'relative flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
