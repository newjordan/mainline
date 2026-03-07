import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { RecoveryHashRedirect } from '@/components/auth/recovery-hash-redirect';
import { getBusinessProfile } from '@/lib/config/business-profile';
import { isScreenshotCaptureEnabled } from '@/lib/screenshot-mode';
import './globals.css';

// Validate environment variables at startup (fail-fast)
import '@/lib/env';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';
const businessProfile = getBusinessProfile();
const screenshotCaptureEnabled = isScreenshotCaptureEnabled();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: businessProfile.companyName,
  description: businessProfile.marketing.metaDescription,
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} antialiased${screenshotCaptureEnabled ? ' screenshot-capture' : ''}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RecoveryHashRedirect />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
