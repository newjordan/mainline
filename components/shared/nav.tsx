'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/customers', label: 'Customers' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/invoices', label: 'Invoices' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b p-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
