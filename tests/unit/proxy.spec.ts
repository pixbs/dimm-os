import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxy } from '@/proxy'

const desk =
  '<!doctype html><html><body><article data-front><h1>Not found</h1></article></body></html>'

// The deployment as the proxy's own requests meet it: a view with the status given, and the desk at every address.
function deployment(view: number) {
  const answer = vi.fn(async (input: string | URL | Request) =>
    new URL(String(input)).pathname.startsWith('/view/')
      ? new Response(null, { status: view })
      : new Response(desk, {
          headers: { 'content-type': 'text/html', 'content-encoding': 'br', etag: '"desk"' },
        }),
  )
  vi.stubGlobal('fetch', answer)
  return answer
}

afterEach(() => vi.unstubAllGlobals())

describe('the proxy at an address that names no window', () => {
  it.each(['/does-not-exist', '/de/gibt-es-nicht'])(
    'answers %s with 404 and the desk itself, as no rewrite can',
    async (path) => {
      deployment(404)
      const response = await proxy(new NextRequest(`https://dimm.test${path}`))

      expect(response.status).toBe(404)
      // A rewrite with an error status is served as the platform's own 404 page.
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
      expect(await response.text()).toBe(desk)
      expect(response.headers.get('content-encoding')).toBeNull()
      expect(response.headers.get('etag')).toBeNull()
    },
  )

  it('answers a visitor the same, out of every cache', async () => {
    const answer = deployment(404)
    const response = await proxy(
      new NextRequest('https://dimm.test/does-not-exist', { headers: { cookie: 'visitor=one' } }),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(answer).toHaveBeenLastCalledWith(
      'https://dimm.test/does-not-exist',
      expect.objectContaining({ headers: expect.objectContaining({ cookie: 'visitor=one' }) }),
    )
  })

  it('rewrites an address with a window to its page', async () => {
    deployment(200)
    const response = await proxy(new NextRequest('https://dimm.test/de/work'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-rewrite')).toBe('https://dimm.test/de/work')
  })
})
