import { notFound } from 'next/navigation'

import { Catalogue, pages } from '@/ds/catalogue/Catalogue'
import { hasLanguage, languages } from '@/i18n/address'

export const dynamic = 'force-static'
// A page the build did not make has no route, so Next.js answers it with the not-found page.
export const dynamicParams = false

// The catalogue is a tool of the build: production does not serve it.
const served = process.env.VERCEL_ENV !== 'production'

export function generateStaticParams() {
  if (!served) return []

  return languages.flatMap((lang) =>
    pages.map((name) => ({ lang, page: name === 'index' ? [] : [name] })),
  )
}

export default async function Page({ params }: PageProps<'/catalogue/[lang]/[[...page]]'>) {
  const { lang, page = ['index'] } = await params
  const name = pages.find((known) => known === page.join('/'))
  if (!hasLanguage(lang) || !name) notFound()

  return <Catalogue language={lang} name={name} />
}
