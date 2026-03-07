'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader Component
 *
 * Consistent header for dashboard pages.
 * - Optional back button for detail pages
 * - Action buttons on the right
 * - Sticky positioning on scroll
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {backHref !== undefined && (
            <button
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent/80"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{title}</h1>
            {subtitle && (
              <p className="truncate text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * HeaderAction Component
 *
 * Styled button for use in PageHeader actions.
 */
export function HeaderAction({
  children,
  onClick,
  href,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'primary';
  className?: string;
}) {
  const baseStyles =
    'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors';

  const variantStyles = {
    default: 'bg-accent text-accent-foreground hover:bg-accent/80',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  };

  const combinedClassName = cn(baseStyles, variantStyles[variant], className);

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={combinedClassName}>
      {children}
    </button>
  );
}
