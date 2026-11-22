import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { getMissingView, getView } from '@/data/views'
import { hasLanguage, languages, toAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'
import { Desk } from '@/shell/Desk'

// A guest's page is static: no cookie reaches it, so its viewer is always a guest.
export const dynamic = 'force-static'

export { generateStaticParams } from '@/data/views'

// A window's words and picture, with its address in each language. A window this viewer may not see answers as the
// 404, which is not indexed.
export async function generateMetadata({
  params,
}: PageProps<'/guest/[lang]/[[...path]]'>): Promise<Metadata> {
  const { lang, path } = await params
  if (!hasLanguage(lang)) return {}
  const found = await getView(lang, path)
  if (!found || 'moved' in found) return { robots: { index: false } }
  const { window } = found
  // The desk at / has no window, and keeps the site's own title.
  const meta = window?.meta
  const address = `/${(path ?? []).join('/')}`
  const image = meta?.image
  return {
    ...(meta && { title: meta.title, description: meta.description }),
    alternates: {
      canonical: toAddress(lang, address),
      languages: {
        ...Object.fromEntries(languages.map((one) => [one, toAddress(one, address)])),
        'x-default': toAddress(languages[0], address),
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Dimm OS',
      locale: lang,
      url: toAddress(lang, address),
      ...(meta && { title: meta.title, description: meta.description ?? undefined }),
      images: image ? [image] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary' },
  }
}

// A window that moved redirects. The proxy sends an address with nothing to the not-found page, so one arrives
// here only when its view was late, and shows the 404 window all the same.
export default async function Page({ params }: PageProps<'/guest/[lang]/[[...path]]'>) {
  const { lang, path } = await params
  if (!hasLanguage(lang)) notFound()
  const found = await getView(lang, path)
  if (found && 'moved' in found) redirect(toAddress(lang, found.moved))
  const view = found ?? (await getMissingView(lang, `/${(path ?? []).join('/')}`))
  return <Desk dictionary={await getDictionary(view.language)} view={view} />
}
