import { cn } from '@/lib/utils';

/**
 * Skeleton Component
 *
 * Animated placeholder for loading states.
 * Uses pulse animation for visual feedback.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
