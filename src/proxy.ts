import { type NextRequest, NextResponse } from 'next/server'

import { VISITOR_COOKIE } from './data/viewer'
import { fromAddress, toRoute } from './i18n/address'

// A view's route already names its language; a window's address gets its segment here.
function toInternal(pathname: string): string {
  if (pathname.startsWith('/view/')) return pathname

  const { language, path } = fromAddress(pathname)
  return toRoute(language, path)
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  // The cookie's presence alone picks the uncached variant: reading it is the variant's work.
  const visitor = request.cookies.has(VISITOR_COOKIE)
  url.pathname = (visitor ? '/visitor' : '') + toInternal(url.pathname)

  const response = NextResponse.rewrite(url)
  // A route handler sets no cache header by itself, and a visitor's view must stay out of every cache.
  if (visitor) response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  // Payload's routes, the framework's files and any file with an extension pass untouched.
  matcher: ['/((?!(?:api|admin|_next)(?:/|$)|.*\\.).*)'],
}
