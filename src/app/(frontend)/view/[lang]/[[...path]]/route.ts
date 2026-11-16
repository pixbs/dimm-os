import { redirect } from 'next/navigation'

import { getView } from '@/data/views'
import { hasLanguage, toRoute } from '@/i18n/address'

// A guest's view is static, like the page it belongs to.
export const dynamic = 'force-static'

export { generateStaticParams } from '@/data/views'

export async function GET(_request: Request, { params }: RouteContext<'/view/[lang]/[[...path]]'>) {
  const { lang, path } = await params
  const view = await getView(lang, path)
  if (!view || !hasLanguage(lang)) return new Response(null, { status: 404 })
  if ('moved' in view) redirect(`/view${toRoute(lang, view.moved)}`)

  return Response.json(view)
}
