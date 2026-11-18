import type { MetadataRoute } from 'next'

import { getSitemapAddresses } from '@/data/views'
import { languages, origin, toAddress } from '@/i18n/address'

// Every address a guest may open, each with its counterparts in the other language.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const addresses = await getSitemapAddresses()
  const base = origin()
  const url = (language: (typeof languages)[number], path: string) =>
    new URL(toAddress(language, path), base).href
  return languages.flatMap((language) =>
    addresses[language].map((path) => ({
      url: url(language, path),
      alternates: {
        languages: Object.fromEntries(
          languages
            .filter((one) => addresses[one].includes(path))
            .map((one) => [one, url(one, path)]),
        ),
      },
    })),
  )
}
