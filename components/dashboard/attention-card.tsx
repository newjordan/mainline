import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

export interface AttentionCardProps {
  count: number;
  label: string;
  singularLabel?: string;
  href: string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success';
}

/**
 * AttentionCard Component
 *
 * Displays a count of items needing attention with a link to the relevant list.
 * Used on the dashboard home screen to show unread messages, pending quotes, etc.
 */
export function AttentionCard({
  count,
  label,
  singularLabel,
  href,
  icon: Icon,
  variant = 'default',
}: AttentionCardProps) {
  const variantStyles = {
    default: 'border-border bg-card',
    warning: 'border-amber-500/50 bg-amber-500/10',
    success: 'border-green-500/50 bg-green-500/10',
  };

  const countStyles = {
    default: 'text-foreground',
    warning: 'text-amber-500',
    success: 'text-green-500',
  };

  const displayLabel = count === 1 && singularLabel ? singularLabel : label;

  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors active:bg-accent/50 ${variantStyles[variant]}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent/20`}
      >
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <div className="flex-1">
        <p className={`text-3xl font-bold ${countStyles[variant]}`}>{count}</p>
        <p className="text-sm text-muted-foreground">{displayLabel}</p>
      </div>
    </Link>
  );
}
