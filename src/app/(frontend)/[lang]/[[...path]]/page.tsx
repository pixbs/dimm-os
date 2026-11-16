import { notFound, redirect } from 'next/navigation'

import { getMissingView, getView } from '@/data/views'
import { hasLanguage, toAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'
import { Desk } from '@/shell/Desk'

// A guest's page is static: no cookie reaches it, so its viewer is always a guest.
export const dynamic = 'force-static'

export { generateStaticParams } from '@/data/views'

// An address with nothing for this viewer shows the 404 window, and the proxy answers it with 404; a window that
// moved redirects. Both are known before anything streams.
export default async function Page({ params }: PageProps<'/[lang]/[[...path]]'>) {
  const { lang, path } = await params
  if (!hasLanguage(lang)) notFound()
  const found = await getView(lang, path)
  if (found && 'moved' in found) redirect(toAddress(lang, found.moved))
  const view = found ?? (await getMissingView(lang))

  return <Desk dictionary={await getDictionary(view.language)} view={view} />
}
