import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

// The fixture item told at length: a Header, Text beside its headings, a joined part and a closing call.
const grow = (page: Page) => page.locator('#window-work')
const section = (window: Locator, heading: string) =>
  window.locator('section', {
    has: window.page().getByRole('heading', { name: heading, exact: true }),
  })
const box = async (part: Locator) => (await part.boundingBox())!

test.describe('Sections', () => {
  test('stand a heading beside its body in a wide window, and above it in a regular and a compact one', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work/grow')
    const question = section(grow(page), 'The question')
    const [head, body] = ['.section__head', '.section__body'].map((part) => question.locator(part))

    await expect(head).toBeVisible()
    let [above, beside] = [await box(head), await box(body)]
    expect(above.y + above.height).toBeLessThanOrEqual(beside.y)

    await grow(page).getByRole('button', { name: 'Full screen' }).click()
    await expect(grow(page).locator('.window__body')).toHaveJSProperty('clientWidth', 1440)
    await expect.poll(async () => (await box(body)).x).toBeGreaterThan((await box(head)).x)
    // Read in one frame: what stands above may still be growing with the window.
    ;[above, beside] = await question.evaluate((section) =>
      ['.section__head', '.section__body'].map((part) =>
        section.querySelector(part)!.getBoundingClientRect().toJSON(),
      ),
    )
    expect(beside.x).toBeGreaterThanOrEqual(above.x + above.width)
    expect(Math.abs(beside.y - above.y)).toBeLessThan(8)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    ;[above, beside] = [await box(head), await box(body)]
    expect(above.y + above.height).toBeLessThanOrEqual(beside.y)
  })

  test('keeps a paragraph to the measure of prose, and a lead paragraph and a list to the wider one', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work/grow')
    await grow(page).getByRole('button', { name: 'Full screen' }).click()

    await expect(grow(page).locator('h1 + .hgroup__text')).toHaveCSS('width', '640px')
    await expect(section(grow(page), 'The question').locator('.prose > p').first()).toHaveCSS(
      'width',
      '560px',
    )
    await expect(section(grow(page), 'The question').locator('.prose')).toHaveCSS(
      'max-width',
      '640px',
    )
  })

  test('joins a section to the one above, under its heading', async ({ page }) => {
    await page.goto('/de/work/grow')
    const changed = section(grow(page), 'Was sich geändert hat')

    await expect(changed.locator('.section__body > .prose')).toHaveText([
      /^Eine Überschrift im Text/,
      'Ein Teil, der an den Abschnitt darüber anschließt und unter dessen Überschrift steht.',
    ])
    await expect(changed.getByRole('heading')).toHaveText([
      'Was sich geändert hat',
      'Eine Überschrift im Text',
    ])
  })

  test('closes a window with a call on an accent, whose button goes to another window', async ({
    page,
  }) => {
    await page.goto('/work/grow')
    const call = section(grow(page), 'A closing line that asks for one thing')

    await expect(call).toHaveAttribute('data-surface', 'orange')
    await expect(call.getByRole('heading', { level: 2 })).toBeVisible()
    await expect(call.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
    await expect(grow(page).getByRole('heading', { level: 1 })).toHaveText('Grow')
  })

  test('lets what lies below the fold arrive once, as it is scrolled to, and leaves what the server painted as it is', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/work/grow')
    const body = grow(page).locator('.window__body')
    await body.evaluate((body) => body.scrollTo(0, body.scrollHeight))
    await expect(grow(page).locator('[data-enter]')).toHaveCount(0)

    // An item opened in its window is drawn here: its parts below the fold wait for the scroll, not its sections.
    await page.goto('/work')
    await grow(page).getByRole('link', { name: 'Grow' }).click()
    const call = section(grow(page), 'A closing line that asks for one thing')
    const heading = call.getByRole('heading', { level: 2 })
    await expect(heading).toHaveAttribute('data-enter', 'wait')
    await expect(call).not.toHaveAttribute('data-enter')
    await expect(grow(page).getByText('Grow', { exact: true }).first()).toBeVisible()

    await body.evaluate((body) => body.scrollTo(0, body.scrollHeight))
    await expect(heading).not.toHaveAttribute('data-enter')
    await expect(heading).toHaveCSS('opacity', '1')
    await expect(heading).toHaveCSS('transform', 'none')

    // Once is once: scrolled away and back, it stays.
    await body.evaluate((body) => body.scrollTo(0, 0))
    await body.evaluate((body) => body.scrollTo(0, body.scrollHeight))
    await expect(heading).not.toHaveAttribute('data-enter')
  })

  test('has everything there at once under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/work')
    await grow(page).getByRole('link', { name: 'Grow' }).click()
    await expect(grow(page).getByRole('heading', { level: 1, name: 'Grow' })).toBeVisible()
    await expect(grow(page).locator('.window__view')).toHaveCount(1)

    await expect(grow(page).locator('[data-enter], [data-decode]')).toHaveCount(0)
  })
})
