'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster Component
 *
 * Wraps sonner's Toaster with dark mode styling for dashboard.
 * Auto-dismisses success toasts after 3s, errors require manual dismiss.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:!bg-green-950 group-[.toaster]:!border-green-900',
          error: 'group-[.toaster]:!bg-red-950 group-[.toaster]:!border-red-900',
          warning: 'group-[.toaster]:!bg-amber-950 group-[.toaster]:!border-amber-900',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
