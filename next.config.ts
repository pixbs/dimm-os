import { withPayload } from '@payloadcms/next/withPayload'
import { execSync } from 'child_process'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// The site's own Blob store, named in its token as Payload's storage reads it, so no other store's files are resized.
const store = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]

const blob = store && `https://${store.toLowerCase()}.public.blob.vercel-storage.com`
const analytics = URL.canParse(process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '')
  ? new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST!).origin
  : undefined
const dev = process.env.NODE_ENV === 'development'

// Without nonces, as #2 decided, so pages for guests stay static: the inline scripts Next.js writes are allowed.
// The admin uploads straight to the Blob store's API and shows its files; analytics sends to its host alone.
const policy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  ['img-src', "'self'", 'blob:', 'data:', blob].filter(Boolean).join(' '),
  ['media-src', "'self'", blob].filter(Boolean).join(' '),
  "font-src 'self'",
  ['connect-src', "'self'", blob && 'https://vercel.com/api/blob/', analytics]
    .filter(Boolean)
    .join(' '),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const security = [
  { key: 'Content-Security-Policy', value: policy },
  // Another site learns the origin a visitor came from, never the path.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
]

// The system's version is the year and month of the commit being built; a build outside git takes the month it runs in.
function version() {
  try {
    const made = execSync('git log -1 --format=%cd --date=format:%Y.%m', {
      encoding: 'utf8',
    }).trim()
    if (made) return made
  } catch {
    // The month of the build stands in.
  }
  return new Date().toISOString().slice(0, 7).replace('-', '.')
}

const nextConfig: NextConfig = {
  env: { SYSTEM_VERSION: version() },
  // AGENTS.md points at the docs Next.js ships instead of carrying a copy of its notes.
  agentRules: false,
  poweredByHeader: false,
  headers: async () => [{ source: '/:path*', headers: security }],
  images: {
    // A picture is made at these widths alone and kept 31 days: the plan makes 5,000 sizes a month and then stops.
    deviceSizes: [640, 960, 1280, 1920],
    imageSizes: [],
    minimumCacheTTL: 2678400,
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    // In the cloud a picture is a public file of the Blob store, which its address names.
    remotePatterns: store
      ? [{ protocol: 'https', hostname: `${store.toLowerCase()}.public.blob.vercel-storage.com` }]
      : [],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

const config = withPayload(nextConfig, { devBundleServerPackages: false })
const payloadHeaders = config.headers!

// Payload asks every route for the colour scheme, and Critical-CH makes Chrome load each first page twice, so only
// the admin, which reads it, asks.
export default {
  ...config,
  headers: async () =>
    (await payloadHeaders()).map((rule) =>
      rule.headers.some(({ key }) => key === 'Critical-CH')
        ? { ...rule, source: '/admin/:path*' }
        : rule,
    ),
} satisfies NextConfig
