import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Security headers applied to every response.
// ---------------------------------------------------------------------------
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't embed in iframes on foreign origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // HSTS — 2 years, include subdomains, submit to preload list
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Limit referrer to origin-only for cross-origin requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unused browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // DNS prefetch helps performance without leaking URLs
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Content-Security-Policy',
    // unsafe-inline required for Next.js ThemeScript + Tailwind runtime styles.
    // img-src uses https: wildcard because thumbnails are served from YouTube CDN,
    // Supabase Storage, and other external origins.
    // frame-src restricts embeds to the three supported video platforms only.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src https://www.youtube.com https://player.vimeo.com https://www.tiktok.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
