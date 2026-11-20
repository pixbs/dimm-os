import { expect, test } from './test'

test.describe('Headers', () => {
  test('every answer carries the policy without a nonce, and the standard headers', async ({
    page,
  }) => {
    for (const path of ['/', '/de/work', '/admin/login']) {
      const headers = (await page.request.get(path)).headers()
      const policy = headers['content-security-policy']

      expect(policy, path).toContain("default-src 'self'")
      expect(policy, path).toContain("script-src 'self' 'unsafe-inline'")
      expect(policy, path).not.toContain('nonce-')
      // Another site learns the origin a visitor came from, never the path.
      expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
      expect(headers['strict-transport-security'], path).toContain('max-age=')
      expect(headers['x-content-type-options'], path).toBe('nosniff')
      expect(headers['x-frame-options'], path).toBe('SAMEORIGIN')
      expect(headers['permissions-policy'], path).toContain('camera=()')
      expect(headers, path).not.toHaveProperty('x-powered-by')
    }
  })

  test('only the admin asks the browser for its colour scheme', async ({ page }) => {
    for (const path of ['/', '/de/work', '/login']) {
      const headers = (await page.request.get(path)).headers()

      expect(headers, path).not.toHaveProperty('accept-ch')
      expect(headers, path).not.toHaveProperty('critical-ch')
      expect(headers.vary ?? '', path).not.toContain('Sec-CH-Prefers-Color-Scheme')
    }
    for (const path of ['/admin', '/admin/login']) {
      const headers = (await page.request.get(path)).headers()

      expect(headers['accept-ch'], path).toBe('Sec-CH-Prefers-Color-Scheme')
      expect(headers['critical-ch'], path).toBe('Sec-CH-Prefers-Color-Scheme')
    }
  })
})
