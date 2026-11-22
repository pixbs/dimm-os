import { headers } from 'next/headers'

import { ASKED } from '@/data/viewer'
import { getMissingView } from '@/data/views'
import { fromAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'
import { Desk } from '@/shell/Desk'

import Layout from './(frontend)/guest/[lang]/layout'

export { metadata } from './(frontend)/guest/[lang]/layout'

// What Next.js answers, with 404, at an address no route has: the desk with the 404 window, in the language of the
// address the proxy noted.
export default async function GlobalNotFound() {
  const { language, path } = fromAddress((await headers()).get(ASKED) ?? '/404')
  const view = await getMissingView(language, path)

  return (
    <Layout params={Promise.resolve({ lang: language })}>
      <Desk dictionary={await getDictionary(language)} view={view} />
    </Layout>
  )
}
