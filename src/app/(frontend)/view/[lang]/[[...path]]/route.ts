import { getView } from '@/data/views'

// A guest's view is static, like the page it belongs to.
export const dynamic = 'force-static'

export { generateStaticParams } from '@/data/views'

export async function GET(_request: Request, { params }: RouteContext<'/view/[lang]/[[...path]]'>) {
  const { lang, path } = await params
  const view = await getView(lang, path)

  return view ? Response.json(view) : new Response(null, { status: 404 })
}
