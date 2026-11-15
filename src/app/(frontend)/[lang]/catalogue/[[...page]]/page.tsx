import { notFound } from 'next/navigation'

import { Catalogue, pages } from '@/ds/catalogue/Catalogue'
import { hasLanguage, languages } from '@/i18n/address'

export const dynamic = 'force-static'

// The catalogue is a tool of the build: production does not serve it.
const served = process.env.VERCEL_ENV !== 'production'

export function generateStaticParams() {
  if (!served) return []

  return languages.flatMap((lang) =>
    pages.map((name) => ({ lang, page: name === 'index' ? [] : [name] })),
  )
}

export default async function Page({ params }: PageProps<'/[lang]/catalogue/[[...page]]'>) {
  const { lang, page = ['index'] } = await params
  const name = pages.find((known) => known === page.join('/'))
  if (!served || !hasLanguage(lang) || !name) notFound()

  return <Catalogue language={lang} name={name} />
}
