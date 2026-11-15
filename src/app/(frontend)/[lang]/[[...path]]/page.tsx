import { notFound } from 'next/navigation'

import { getView } from '@/data/views'
import { getDictionary } from '@/i18n/dictionaries'
import { Desk } from '@/shell/Desk'

// A guest's page is static: no cookie reaches it, so its viewer is always a guest.
export const dynamic = 'force-static'

export { generateStaticParams } from '@/data/views'

export default async function Page({ params }: PageProps<'/[lang]/[[...path]]'>) {
  const { lang, path } = await params
  const view = await getView(lang, path)
  if (!view) notFound()

  return <Desk dictionary={await getDictionary(view.language)} view={view} />
}
