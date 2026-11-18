import type { MetadataRoute } from 'next'

import { origin } from '@/i18n/address'

// The windows are for every crawler; the admin, the API and the views the desk fetches are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/view/'] },
    sitemap: new URL('/sitemap.xml', origin()).href,
  }
}
