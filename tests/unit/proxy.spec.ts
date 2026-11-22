import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxy } from '@/proxy'

// The deployment as the proxy's own request meets it: a view with the status given.
function deployment(view: number) {
  const answer = vi.fn(async () => new Response(null, { status: view }))
  vi.stubGlobal('fetch', answer)
  return answer
}

const rewritten = (response: Response) => response.headers.get('x-middleware-rewrite')
// The address asked for, as the proxy notes it on the request for the not-found page.
const asked = (response: Response) => response.headers.get('x-middleware-request-x-asked')

afterEach(() => vi.unstubAllGlobals())

describe('the proxy at an address that names no window', () => {
  it.each(['/does-not-exist', '/de/gibt-es-nicht', '/de/nothing.html'])(
    'sends %s where no route answers, so Next.js draws its not-found page with 404',
    async (path) => {
      deployment(404)
      const response = await proxy(new NextRequest(`https://dimm.test${path}`))

      expect(rewritten(response)).toBe('https://dimm.test/404')
      expect(asked(response)).toBe(path)
      // A rewrite with an error status is answered by the platform, not by the page.
      expect(response.status).toBe(200)
    },
  )

  it('asks the view as the visitor, and keeps the answer out of every cache', async () => {
    const answer = deployment(404)
    const response = await proxy(
      new NextRequest('https://dimm.test/does-not-exist', { headers: { cookie: 'visitor=one' } }),
    )

    expect(rewritten(response)).toBe('https://dimm.test/404')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(answer).toHaveBeenLastCalledWith(
      new URL('https://dimm.test/view/en/does-not-exist'),
      expect.objectContaining({ headers: { cookie: 'visitor=one' } }),
    )
  })

  it('rewrites an address with a window to its page', async () => {
    deployment(200)
    const response = await proxy(new NextRequest('https://dimm.test/de/work'))

    expect(rewritten(response)).toBe('https://dimm.test/guest/de/work')
  })

  it('lets the address of a file pass, with the address noted for one that is not there', async () => {
    const answer = deployment(404)
    const response = await proxy(new NextRequest('https://dimm.test/licenses/nothing.txt'))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(asked(response)).toBe('/licenses/nothing.txt')
    expect(answer).not.toHaveBeenCalled()
  })

  it('sends a page of the catalogue to its route, which has only the pages the build made', async () => {
    const answer = deployment(404)
    const response = await proxy(new NextRequest('https://dimm.test/de/catalogue/nothing'))

    expect(rewritten(response)).toBe('https://dimm.test/catalogue/de/nothing')
    expect(answer).not.toHaveBeenCalled()
  })
})
