import { lang } from 'next/root-params'

import { getMissingView } from '@/data/views'
import { getDictionary } from '@/i18n/dictionaries'
import { Desk } from '@/shell/Desk'

// Any address with nothing for this viewer is the desk with the 404 window.
export default async function NotFound() {
  const view = await getMissingView(await lang())

  return <Desk dictionary={await getDictionary(view.language)} view={view} />
}
