import { gunzipSync } from 'node:zlib'

import type { Page, Request } from '@playwright/test'

import { version } from '../../src/consent/registry'
import { expect, test } from './test'

const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

// Whatever is sent to the analytics host is answered here and never leaves the test.
async function intercept(page: Page) {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'webdriver', { get: () => false }),
  )
  const sent: Request[] = []
  await page.route(`${host}/**`, (route) => {
    sent.push(route.request())
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' })
  })
  return sent
}

const cookies = async (page: Page) =>
  (await page.context().cookies()).filter(({ name }) => /^_*ph_/.test(name))

// The events of a request, compressed or not.
function events(request: Request) {
  const raw = request.postDataBuffer()
  if (!raw) return []
  const text = (raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw).toString()
  const body = JSON.parse(text)
  return (Array.isArray(body) ? body : (body.batch ?? [body])) as {
    event: string
    properties: Record<string, unknown>
  }[]
}

// PostHog drops what an automated browser sends as a bot's, so the test browser passes for a person's.
test.use({
  asked: true,
  viewport: { width: 1440, height: 900 },
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
})
test.skip(!host || !process.env.NEXT_PUBLIC_POSTHOG_KEY, 'Analytics is not set up for this build.')

test.describe('Analytics', () => {
  test('sends nothing and keeps nothing before a choice and after a no', async ({ page }) => {
    const sent = await intercept(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    expect(sent).toHaveLength(0)
    expect(await cookies(page)).toHaveLength(0)

    await page.locator('#window-cookies').getByRole('button', { name: 'Decline' }).click()
    await page.reload({ waitUntil: 'networkidle' })
    expect(sent).toHaveLength(0)
    expect(await cookies(page)).toHaveLength(0)
  })

  test('after a yes, its first event carries the consent version, and a no taken back clears it', async ({
    page,
  }) => {
    const sent = await intercept(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.locator('#window-cookies').getByRole('button', { name: 'Accept' }).click()

    await expect.poll(() => sent.flatMap(events).length).toBeGreaterThan(0)
    const [first] = sent.flatMap(events)
    expect(first.properties).toMatchObject({ consent_version: version })
    expect(first.properties.consent_at).toEqual(expect.any(String))
    const [cookie] = await cookies(page)
    // A year, as the registry says, give or take the minute the test takes.
    expect(cookie.expires * 1000 - Date.now()).toBeGreaterThan(364 * 24 * 60 * 60 * 1000)

    await page.goto('/cookies/preferences', { waitUntil: 'networkidle' })
    const reloaded = page.waitForEvent('load')
    await page.locator('#window-cookies').getByRole('button', { name: 'Decline' }).click()
    await reloaded
    await page.waitForLoadState('networkidle')
    const before = sent.length
    expect(await cookies(page)).toHaveLength(0)
    await page.locator('body').click({ position: { x: 700, y: 450 } })
    await page.waitForTimeout(1000)
    expect(sent).toHaveLength(before)
  })
})
