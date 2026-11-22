import { type NextRequest, NextResponse } from 'next/server'

import { ASKED, VISITOR_COOKIE } from './data/viewer'
import { fromAddress, languages, toRoute } from './i18n/address'

// A view's route already names its language; a window's address gets its segment here.
function toInternal(pathname: string): string {
  if (pathname.startsWith('/view/')) return pathname

  const { language, path } = fromAddress(pathname)
  // The login screen stands over the desk.
  return toRoute(language, path === '/login' ? '/' : path)
}

const VIEW_TIMEOUT = 3000

// A visitor's view must stay out of every cache.
const UNCACHED = 'private, no-store'

// No route answers here, so Next.js draws its not-found page, with 404.
const NOWHERE = '/404'

// A file's address has a dot, and stands outside a language and outside the routes the proxy sends to.
const routed = new RegExp(`^/(?:${[...languages, 'guest', 'visitor', 'view'].join('|')})/`)
const file = (pathname: string) => pathname.includes('.') && !routed.test(pathname)

// Whether a window's page has nothing for this viewer, as its view says. Next.js draws a page's own notFound() with
// script alone, so its docs have the proxy check and send the address to a not-found route.
async function missing(request: NextRequest, route: string): Promise<boolean> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  try {
    const view = await fetch(new URL(`/view${route}`, request.url), {
      method: 'HEAD',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      redirect: 'manual',
      // A view that does not answer in time leaves the page its 200 rather than holding it.
      signal: AbortSignal.timeout(VIEW_TIMEOUT),
    })
    return view.status === 404
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  // What the login screen posts goes to its route.
  if (url.pathname === '/login' && request.method !== 'GET' && request.method !== 'HEAD')
    return NextResponse.next()
  // The not-found page reads the address asked for here, as only the proxy can tell it.
  const headers = new Headers(request.headers)
  headers.set(ASKED, url.pathname)
  const asked = { request: { headers } }
  // A file passes as it is; one that is not there has no route.
  if (file(url.pathname)) return NextResponse.next(asked)

  const route = toInternal(url.pathname)
  const view = route.startsWith('/view/')
  const [, language, first, ...rest] = route.split('/')
  // The catalogue is the build's, the same for everyone: a page the build did not make has no route.
  if (!view && first === 'catalogue') {
    url.pathname = ['', first, language, ...rest].join('/')
    return NextResponse.rewrite(url, asked)
  }
  // The cookie's presence alone picks the uncached variant: reading it is the variant's work.
  const visitor = request.cookies.has(VISITOR_COOKIE)
  const lost = !view && (await missing(request, route))
  url.pathname = lost ? NOWHERE : (visitor ? '/visitor' : view ? '' : '/guest') + route

  const response = NextResponse.rewrite(url, asked)
  // A route handler sets no cache header by itself.
  if (visitor) response.headers.set('Cache-Control', UNCACHED)
  return response
}

export const config = {
  // Payload's routes, the framework's files and what forms post to pass untouched.
  matcher: ['/((?!(?:api|admin|_next|send)(?:/|$)).*)'],
}
