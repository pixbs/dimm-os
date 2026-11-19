import { NextResponse } from 'next/server'

import { signIn } from '@/data/login'
import { VISITOR_COOKIE } from '@/data/viewer'

// Another site can neither sign this device in nor out.
const foreign = (request: Request) => {
  const origin = request.headers.get('origin')
  return Boolean(origin) && new URL(origin!).host !== request.headers.get('host')
}

// The password of the login screen, or of a personal link, arrives in the body alone. Two answers besides the way
// in: one for an empty, a wrong and an expired password, and one for too many tries. Neither is an error to the
// browser, which would log it.
export async function POST(request: Request) {
  if (foreign(request)) return new Response(null, { status: 403 })
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''
  // The first address the proxy in front names is the device's own.
  const sender =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null

  const signed = await signIn(password, sender)
  if (signed === 'limited') return Response.json({ in: false, limited: true })
  if (!signed) return Response.json({ in: false })

  // The server must know the visitor to render a hidden window, so the cookie is the server's alone, and ends on
  // the visitor's end date.
  const response = NextResponse.json({ in: true })
  response.cookies.set(VISITOR_COOKIE, signed.value, {
    expires: signed.expires,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
  })
  return response
}

// "Continue as Guest" ends the cookie.
export function DELETE(request: Request) {
  if (foreign(request)) return new Response(null, { status: 403 })
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(VISITOR_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/', secure: true })
  return response
}
