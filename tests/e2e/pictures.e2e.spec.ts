import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

const work = (page: Page) => page.locator('#window-work')
const portrait = (page: Page) =>
  work(page).getByRole('figure').filter({ hasText: 'A live picture' })

// Whether the portrait's drawing came over the network, read from every script the page loaded.
function drawingFetched(page: Page) {
  const bodies: Promise<string>[] = []
  page.on('response', (response) => {
    if (response.url().endsWith('.js')) bodies.push(response.text().catch(() => ''))
  })
  return async () => (await Promise.all(bodies)).some((body) => body.includes('lookIndex'))
}

// What the eyes look like now: the shapes of the pupils and lids.
const eyes = (figure: Locator) =>
  figure
    .locator('.portrait svg')
    .evaluate((svg) =>
      [...svg.querySelectorAll('circle, path')].map((shape) => shape.outerHTML).join(''),
    )

test.describe('Generated pictures', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("the portrait's drawing is fetched only when the portrait shows", async ({ page }) => {
    const fetched = drawingFetched(page)
    await page.goto('/contact', { waitUntil: 'networkidle' })
    expect(await fetched()).toBe(false)

    await page.goto('/work/field', { waitUntil: 'networkidle' })
    await expect(portrait(page).locator('.portrait svg')).toBeVisible()
    await expect(portrait(page).locator('img')).toHaveCSS('opacity', '0')
    expect(await fetched()).toBe(true)
  })

  test('left alone the portrait looks around; held still it looks at the visitor', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/work/field', { waitUntil: 'networkidle' })
    const figure = portrait(page)
    await figure.scrollIntoViewIfNeeded()
    const first = await eyes(figure)
    await expect.poll(() => eyes(figure), { timeout: 8000 }).not.toBe(first)

    for (const [name, value] of [
      ['pause', 'on'],
      ['motion', 'reduce'],
    ]) {
      await page.evaluate(
        ([name, value]) => {
          delete document.documentElement.dataset.pause
          delete document.documentElement.dataset.motion
          document.documentElement.dataset[name] = value
        },
        [name, value],
      )
      const held = await eyes(figure)
      await page.waitForTimeout(1500)
      expect(await eyes(figure)).toBe(held)
    }
  })

  test('a sent slip is stamped: the postmark lands, then the confirmation', async ({ page }) => {
    await page.clock.install({ time: Date.now() + 120_000 })
    await page.goto('/contact', { waitUntil: 'networkidle' })
    const window = page.locator('article[aria-label="Contact"]')
    await window.getByLabel('Email').fill('ana@example.com')
    await window.getByLabel('Message').fill('Hello from the generated pictures test.')
    await page.clock.fastForward(10_000)
    await window.getByRole('button', { name: 'Send' }).click()

    const now = await page.evaluate(() => Date.now())
    const day = ['day', 'month'].map((part) =>
      new Intl.DateTimeFormat('en', { [part]: part === 'day' ? 'numeric' : 'short' }).format(now),
    )
    const postmark = window.getByRole('img', { name: /^Postmark: Dimm OS, Somewhere, sent / })
    await expect(postmark).toBeVisible()
    await expect(postmark).toContainText(day.join(' '))
    await expect(postmark.locator('canvas')).toBeVisible()
    await expect(window.getByText('Message sent.')).toBeVisible()
  })

  test("a postmark picture is dated the visitor's today, as a sent slip is", async ({ page }) => {
    await page.clock.install({ time: new Date(2031, 2, 4, 12) })
    await page.goto('/work/loop')
    const postmark = work(page).locator('.media__live .postmark')

    await expect(postmark.locator('.postmark__around')).toContainText(
      'Dimm OS · Somewhere · Message received',
    )
    await expect(postmark.locator('.postmark__day')).toHaveText('4 Mar')
    await expect(postmark.locator('.postmark__year')).toHaveText('2031')
  })
})

test.describe('Generated pictures at an address without a window', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  // The browser reports the 404 of the page itself as an error.
  test.use({ pageErrors: async ({}, run) => run() })

  test('the 404 is drawn in dots over its still, on the pitch', async ({ page }) => {
    await page.goto('/no-such-page')
    const figure = page.getByRole('figure').filter({ has: page.locator('canvas') })

    await expect(figure.locator('img')).toHaveAttribute('alt', 'The numerals 404 in dots')
    await expect(figure.locator('.media__live canvas')).toBeVisible()
    await expect(figure.locator('img')).toHaveCSS('opacity', '0')
    const { width, pitch } = await figure.locator('canvas').evaluate((canvas) => ({
      width: canvas.clientWidth,
      pitch: parseFloat(getComputedStyle(canvas).getPropertyValue('--pitch')),
    }))
    expect(width % pitch).toBe(0)
  })
})
