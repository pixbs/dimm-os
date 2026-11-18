import { send } from '@/data/send'
import { hasLanguage } from '@/i18n/address'

// What a form posts: which form, in which language, what was typed, the hidden field and when the form opened.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !hasLanguage(body.lang) ||
    typeof body.values !== 'object'
  )
    return new Response(null, { status: 400 })

  const sent = await send(body)
  if (!sent) return new Response(null, { status: 404 })
  return Response.json(sent, { status: sent.ok ? 200 : 422 })
}
