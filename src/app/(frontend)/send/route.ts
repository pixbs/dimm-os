import { send } from '@/data/send'
import { hasLanguage } from '@/i18n/address'

// What a form posts: which form, in which language, what was typed, the hidden field and how long it was open.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !hasLanguage(body.lang) ||
    !body.values ||
    typeof body.values !== 'object'
  )
    return new Response(null, { status: 400 })

  // The first address the proxy in front names is the device's own.
  const sender =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  const sent = await send({ ...body, sender })
  if (!sent) return new Response(null, { status: 404 })
  if (!sent.ok && 'limited' in sent) return new Response(null, { status: 429 })
  return Response.json(sent, { status: sent.ok ? 200 : 422 })
}
