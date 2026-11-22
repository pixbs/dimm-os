import { type NextRequest, NextResponse } from 'next/server'

import { VISITOR_COOKIE } from './data/viewer'
import { fromAddress, toRoute } from './i18n/address'

// A view's route already names its language; a window's address gets its segment here.
function toInternal(pathname: string): string {
  if (pathname.startsWith('/view/')) return pathname

  const { language, path } = fromAddress(pathname)
  // The login screen stands over the desk.
  return toRoute(language, path === '/login' ? '/' : path)
}

const VIEW_TIMEOUT = 3000

// The proxy's own request for a missing page carries this, so the page renders as any other.
const ANSWERING = 'x-answering-missing'

// A visitor's view must stay out of every cache, and so must a 404 that a window published later replaces.
const UNCACHED = 'private, no-store'

// Whether a window's page has nothing for this viewer, as its view says. The page then shows the 404 window, and
// the status is set here, since Next.js draws a page's own notFound() with script alone.
async function missing(request: NextRequest, route: string): Promise<boolean> {
  const [, , first] = route.split('/')
  const page = request.method === 'GET' || request.method === 'HEAD'
  if (
    !page ||
    route.startsWith('/view/') ||
    first === 'catalogue' ||
    request.headers.has(ANSWERING)
  )
    return false
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

// The platform serves its own 404 page for a rewrite with that status, so the proxy answers with the page itself.
async function answer(request: NextRequest, rewrite: NextResponse): Promise<NextResponse> {
  try {
    const page = await fetch(request.url, {
      method: request.method,
      headers: { cookie: request.headers.get('cookie') ?? '', [ANSWERING]: '1' },
      redirect: 'manual',
    })
    if (page.status !== 200) return rewrite
    // The body arrives decoded, so of the page's headers only its type holds for the answer.
    return new NextResponse(page.body, {
      status: 404,
      headers: {
        'Content-Type': page.headers.get('content-type') ?? '',
        'Cache-Control': UNCACHED,
      },
    })
  } catch {
    return rewrite
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  // What the login screen posts goes to its route.
  if (url.pathname === '/login' && request.method !== 'GET' && request.method !== 'HEAD')
    return NextResponse.next()
  // The cookie's presence alone picks the uncached variant: reading it is the variant's work.
  const visitor = request.cookies.has(VISITOR_COOKIE)
  const route = toInternal(url.pathname)
  url.pathname = (visitor ? '/visitor' : '') + route

  const response = NextResponse.rewrite(url)
  // A route handler sets no cache header by itself.
  if (visitor) response.headers.set('Cache-Control', UNCACHED)
  return (await missing(request, route)) ? answer(request, response) : response
}

export const config = {
  // Payload's routes, the framework's files, what forms post to and any file with an extension pass untouched, except under
  // a language's segment, where no file lives and an address with a dot is still a window's.
  matcher: ['/((?!(?:api|admin|_next|send)(?:/|$)|.*\\.).*)', '/(en|de)/(.*\\..*)'],
}
