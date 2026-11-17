import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

const work = (page: Page) => page.locator('#window-work')
const section = (window: Locator, heading: string) =>
  window.locator('section', {
    has: window.page().getByRole('heading', { name: heading, exact: true }),
  })
const box = async (part: Locator) => (await part.boundingBox())!
const tops = async (boxes: Locator) =>
  new Set(await Promise.all((await boxes.all()).map(async (one) => (await box(one)).y)))

// The widths the pictures of a page are asked for.
function widths(page: Page) {
  const asked = new Set<number>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/_next/image') asked.add(Number(url.searchParams.get('w')))
  })
  return asked
}

test.describe('Media', () => {
  test('folds a gallery to the width of its window: three, two, one across', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work/grow')
    const three = section(work(page), 'Three in a row').locator('.media__box')

    await expect(three).toHaveCount(3)
    expect((await tops(three)).size).toBe(2)

    await work(page).getByRole('button', { name: 'Full screen' }).click()
    await expect(work(page).locator('.window__body')).toHaveJSProperty('clientWidth', 1440)
    await expect.poll(async () => (await tops(three)).size).toBe(1)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    expect((await tops(three)).size).toBe(3)
  })

  test('sets a picture inset or edge to edge, with its caption', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/work/grow')
    const body = await box(work(page).locator('.window__body'))
    const [inset, edge] = await Promise.all(
      [0, -1].map((at) =>
        box(work(page).locator('.section:has(> .section__body > .grid)').nth(at)),
      ),
    )
    const figures = work(page).locator('.media__box')

    const first = await box(figures.first())
    expect(first.x).toBeGreaterThan(body.x)
    expect(first.x + first.width).toBeLessThan(body.x + body.width)
    await expect(work(page).locator('figcaption').first()).toHaveText(
      'A picture inset in the window, with its caption.',
    )
    expect(inset.width).toBe(edge.width)
    const last = await box(figures.last())
    expect(last.x).toBe(edge.x)
    expect(last.width).toBe(edge.width)
  })

  test('asks for a picture at the width its column takes, from the short list', async ({
    page,
  }) => {
    const asked = widths(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work/grow')
    const [first, gallery] = [
      work(page).locator('img').first(),
      section(work(page), 'Three in a row').locator('img').first(),
    ]

    await expect(first).toHaveAttribute('sizes', '(max-width: 599px) 100vw, 720px')
    // In a regular window three fold to two across.
    await expect(gallery).toHaveAttribute('sizes', '(max-width: 599px) 100vw, 360px')
    await work(page).getByRole('button', { name: 'Full screen' }).click()
    await expect(first).toHaveAttribute('sizes', '(max-width: 599px) 100vw, 1440px')
    await expect(gallery).toHaveAttribute('sizes', '(max-width: 599px) 100vw, 480px')

    const body = work(page).locator('.window__body')
    await body.evaluate((body) => body.scrollTo(0, body.scrollHeight))
    await expect(work(page).locator('img').last()).toHaveJSProperty('complete', true)
    expect(asked.size).toBeGreaterThan(0)
    expect([...asked].every((width) => [640, 960, 1280, 1920].includes(width))).toBe(true)
  })

  test('shows the first picture at once and lets the others wait their turn', async ({ page }) => {
    await page.goto('/work/grow')
    const [first, later] = [
      work(page).locator('.media').first(),
      work(page).locator('.media').nth(1),
    ]

    await expect(first.locator('img')).toHaveAttribute('loading', 'eager')
    await expect(first.locator('img')).toHaveAttribute('fetchpriority', 'high')
    await expect(first.locator('canvas')).toHaveCount(0)
    await expect(later.locator('img')).toHaveAttribute('loading', 'lazy')
    await expect(later.locator('canvas.media__dots')).toHaveCount(1)
  })

  test('shows the still of a live picture, which no dots resolve', async ({ page }) => {
    await page.goto('/work/field')
    const live = work(page).getByRole('figure').filter({ hasText: 'A live picture' })

    await expect(live.locator('img')).toHaveAttribute('alt', 'A sun drawn in dots')
    await expect(live.locator('img')).toHaveCSS('opacity', '1')
    await expect(live.locator('canvas')).toHaveCount(0)
  })
})
