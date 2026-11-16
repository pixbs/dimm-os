import { type NextRequest, NextResponse } from 'next/server'

import { VISITOR_COOKIE } from './data/viewer'
import { fromAddress, toRoute } from './i18n/address'

// A view's route already names its language; a window's address gets its segment here.
function toInternal(pathname: string): string {
  if (pathname.startsWith('/view/')) return pathname

  const { language, path } = fromAddress(pathname)
  return toRoute(language, path)
}

// Whether a window's page has nothing for this viewer, as its view says. The page then shows the 404 window, and
// the status is set here, since Next.js draws a page's own notFound() with script alone.
async function missing(request: NextRequest, route: string): Promise<boolean> {
  const [, , first] = route.split('/')
  if (request.method !== 'GET' || route.startsWith('/view/') || first === 'catalogue') return false
  try {
    const view = await fetch(new URL(`/view${route}`, request.url), {
      method: 'HEAD',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      redirect: 'manual',
    })
    return view.status === 404
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  // The cookie's presence alone picks the uncached variant: reading it is the variant's work.
  const visitor = request.cookies.has(VISITOR_COOKIE)
  const route = toInternal(url.pathname)
  url.pathname = (visitor ? '/visitor' : '') + route

  const response = NextResponse.rewrite(
    url,
    (await missing(request, route)) ? { status: 404 } : undefined,
  )
  // A route handler sets no cache header by itself, and a visitor's view must stay out of every cache.
  if (visitor) response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  // Payload's routes, the framework's files and any file with an extension pass untouched.
  matcher: ['/((?!(?:api|admin|_next)(?:/|$)|.*\\.).*)'],
}
