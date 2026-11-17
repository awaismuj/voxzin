import path from 'node:path';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// NOTE: 'unsafe-inline' is required by Next.js inline bootstrap scripts and next-themes while pages are
// statically rendered. A nonce-based CSP forces dynamic rendering, so it is deferred to Phase 8 (security).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// In production, the Next.js server reaches the API through Compose service DNS.
const API_URL = process.env.NODE_ENV === 'production'
  ? 'http://api:4000/v1'
  : process.env.API_URL ?? 'http://127.0.0.1:4000/v1';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../../'),
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: process.env.MEDIA_HOSTNAME
      ? [{ protocol: 'https', hostname: process.env.MEDIA_HOSTNAME }]
      : [],
  },
  // Browser calls /api/v1/* on our own origin, so session cookies stay first-party and CSP can stay connect-src 'self'.
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${API_URL}/:path*` },
      // IndexNow key file: https://<site>/<key>.txt (the key is 32-64 hex characters, so it cannot clash with real pages).
      { source: '/:key([a-f0-9]{32,64}).txt', destination: '/indexnow-key/:key' },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default config;
