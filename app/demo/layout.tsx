import type { ReactNode } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Toaster } from '@/components/ui/sonner';
import { getBusinessProfile } from '@/lib/config/business-profile';
import { getDemoAttentionCounts } from '@/lib/demo/demo-data';
import { isScreenshotCaptureEnabled } from '@/lib/screenshot-mode';

export default function DemoLayout({ children }: { children: ReactNode }) {
  const businessProfile = getBusinessProfile();
  const counts = getDemoAttentionCounts();
  const screenshotCaptureEnabled = isScreenshotCaptureEnabled();
  const totalAttention =
    counts.unreadMessages + counts.pendingQuotes + counts.outstandingInvoices;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {!screenshotCaptureEnabled && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <p className="font-semibold uppercase tracking-wide">Test Drive Mode</p>
          <p>
            Simulated Supabase/Twilio/Square connections. No real customer data or provider calls.
          </p>
        </div>
      )}

      <header
        data-demo-shell-header
        className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{businessProfile.companyShortName} Demo</p>
            <p className="text-xs text-muted-foreground">
              {totalAttention} item{totalAttention === 1 ? '' : 's'} need attention
            </p>
          </div>
          <Link
            href="/demo/search"
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main data-demo-shell-content className="pb-20">
        {children}
      </main>

      <div data-demo-shell-nav>
        <BottomNav
          badges={{
            home: totalAttention,
            customers: counts.unreadMessages,
            quotes: counts.pendingQuotes,
            invoices: counts.outstandingInvoices,
          }}
        />
      </div>
      <Toaster />
    </div>
  );
}
