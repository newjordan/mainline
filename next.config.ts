import type { NextConfig } from 'next';

const distDirOverride = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  ...(distDirOverride ? { distDir: distDirOverride } : {}),
  // Disabled for now - dynamic routes with placeholder pages
  // Re-enable when implementing actual data fetching
  // cacheComponents: true,
  experimental: {
    // Mobile photos commonly exceed 1 MB; allow upload server actions to receive
    // files up to a practical working limit.
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },

  async headers() {
    return [
      // Baseline hardening for every route.
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Clickjacking defense on every route EXCEPT the backend-free /demo
      // showcase. Login, dashboard, quotes, invoices, payments all keep DENY.
      {
        source: '/((?!demo).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
      // /demo is a self-contained, data-free demo. Allow ONLY the webx
      // portfolio OS (and local dev) to iframe it; no X-Frame-Options here so
      // the CSP frame-ancestors allowlist governs framing for this route.
      {
        source: '/demo/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://webx-plum.vercel.app http://localhost:8123",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
