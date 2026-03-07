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
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
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
    ];
  },
};

export default nextConfig;
