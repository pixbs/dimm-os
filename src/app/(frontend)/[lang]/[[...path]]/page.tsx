import { notFound, redirect } from 'next/navigation'

import { getView } from '@/data/views'
import { hasLanguage, toAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'
import { Desk } from '@/shell/Desk'

// A guest's page is static: no cookie reaches it, so its viewer is always a guest.
export const dynamic = 'force-static'

export { generateStaticParams } from '@/data/views'

// Nothing streams before the view is known, so a missing window answers 404 and a moved one redirects.
export default async function Page({ params }: PageProps<'/[lang]/[[...path]]'>) {
  const { lang, path } = await params
  const view = await getView(lang, path)
  if (!view || !hasLanguage(lang)) notFound()
  if ('moved' in view) redirect(toAddress(lang, view.moved))

  return <Desk dictionary={await getDictionary(view.language)} view={view} />
}
