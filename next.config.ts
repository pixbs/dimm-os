import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// The site's own Blob store, named in its token as Payload's storage reads it, so no other store's files are resized.
const store = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]

const nextConfig: NextConfig = {
  // AGENTS.md points at the docs Next.js ships instead of carrying a copy of its notes.
  agentRules: false,
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

export default withPayload(nextConfig, { devBundleServerPackages: false })
