/**
 * Dashboard Layout
 *
 * Protected layout for admin routes. Requires authentication.
 * Uses getClaims() for fast session validation (not getUser() which hits DB).
 *
 * Features:
 * - Dark mode theme for outdoor visibility
 * - Bottom navigation for mobile-first experience
 * - Badge counts on navigation tabs
 * - Safe area padding for iPhone home indicator
 * - Global search accessible from header
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/allowed-emails';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Toaster } from '@/components/ui/sonner';
import { getAttentionCounts } from '@/app/actions/dashboard';
import { getBusinessProfile } from '@/lib/config/business-profile';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const businessProfile = getBusinessProfile();
  const supabase = await createClient();

  // Validate session with auth server before rendering protected routes.
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  if (!isAuthenticated) {
    redirect('/auth/login');
  }

  if (!user.email || !isAllowedEmail(user.email)) {
    redirect('/auth/unauthorized');
  }

  // Fetch attention counts for navigation badges (with fallback)
  let counts = { unreadMessages: 0, pendingQuotes: 0, outstandingInvoices: 0 };
  try {
    counts = await getAttentionCounts();
  } catch (error) {
    console.error('[DashboardLayout] Failed to fetch attention counts:', error);
  }
  const totalAttention =
    counts.unreadMessages + counts.pendingQuotes + counts.outstandingInvoices;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Dashboard Header with Search */}
      <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{businessProfile.companyShortName}</span>
          <Link
            href="/search"
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="pb-20">{children}</main>
      <BottomNav
        badges={{
          home: totalAttention,
          customers: counts.unreadMessages,
          quotes: counts.pendingQuotes,
          invoices: counts.outstandingInvoices,
        }}
      />
      <Toaster />
    </div>
  );
}
