import type { Page } from '@playwright/test'

import { expect, test } from './test'

// The fixture's Work window lists its own items, each opening to its preview, filtered by what they relate to: Grow
// relates to Services and the CV, Field to Services, Loop to the CV.
const work = (page: Page) => page.locator('#window-work')
const items = (page: Page) => work(page).locator('.list__item')

// One frame of the list: each version of its rows with its strength, and each row with its name, strength, how far it
// is moved and whether it is lifted out of the flow; and what the count shows over its text.
type Frame = {
  versions: number[]
  rows: { name: string; opacity: number; y: number; lifted: boolean }[]
  cipher: string
}

// Every frame from now on, until the frames are read.
const watch = (page: Page) =>
  page.evaluate(() => {
    const seen: Frame[] = []
    Object.assign(window, { seen })
    requestAnimationFrame(function look() {
      const list = document.querySelector('#window-work .list')
      seen.push({
        versions: [...(list?.querySelectorAll(':scope > .list__rows') ?? [])].map(
          (rows) => +getComputedStyle(rows).opacity,
        ),
        rows: [...(list?.querySelectorAll('.list__item') ?? [])].map((row) => {
          const style = getComputedStyle(row)
          return {
            name: row.querySelector('.row__side > .row__title')?.textContent ?? '',
            opacity: +style.opacity,
            y: new DOMMatrix(style.transform).f,
            lifted: style.position === 'absolute',
          }
        }),
        cipher:
          document.querySelector('#window-work [role=status] [aria-hidden]')?.textContent ?? '',
      })
      requestAnimationFrame(look)
    })
  })
const seen = (page: Page) => page.evaluate(() => (Reflect.get(window, 'seen') as Frame[]).splice(0))

const pick = async (page: Page, from: string, choice: string) => {
  await work(page).getByRole('button', { name: from, exact: true }).click()
  await page.getByRole('menuitemradio', { name: choice }).click()
}

test.describe('A list of the items of a window', () => {
  test('counts them in the toolbar and opens one at a time to its preview', async ({ page }) => {
    await page.goto('/work')
    await expect(work(page).getByRole('status')).toHaveText('3 items')
    await expect(items(page).locator('.row__side > .row__title')).toHaveText([
      'Grow',
      'Field',
      'Loop',
    ])
    await expect(items(page).first().locator('.row__index')).toHaveText('01')

    const grow = page.getByRole('region', { name: 'Grow' })
    await expect(items(page).first().getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    await expect(grow.getByRole('link', { name: 'Grow' })).toHaveAttribute('href', '/work/grow')
    await expect(grow.locator('.row__label')).toHaveText(['Role', 'Outcome'])
    await expect(grow).toContainText('A fixture item that every guest may open.')

    await items(page).nth(1).getByRole('button').first().click()
    await expect(page.getByRole('region', { name: 'Field' })).toBeVisible()
    await expect(grow).toBeHidden()
    await expect(items(page).first().getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  test('filters them: rows that stay slide, rows that go leave, new rows arrive along the spread, the count deciphers', async ({
    page,
  }) => {
    await page.goto('/work')
    await work(page).getByRole('button', { name: 'All', exact: true }).click()
    await expect(page.getByRole('menuitemradio')).toHaveText(['All3', 'Services2', 'CV2'])
    await page.getByRole('menuitemradio', { name: 'Services' }).click()
    await expect(page.getByRole('menu')).toBeHidden()
    await expect(work(page).getByRole('status')).toHaveText('2 items')
    await expect(items(page)).toHaveCount(2)

    await watch(page)
    await pick(page, 'Services', 'CV')
    await expect(items(page).locator('.row__side > .row__title')).toHaveText(['Grow', 'Loop'])
    // An item keeps its place in the whole list.
    await expect(items(page).nth(1).locator('.row__index')).toHaveText('03')
    await expect(work(page).getByRole('status')).toHaveText('2 items')
    await page.waitForTimeout(600)
    const frames = await seen(page)
    const rows = frames.flatMap((frame) => frame.rows)
    expect(rows.filter(({ name }) => name === 'Grow').every(({ opacity }) => opacity === 1)).toBe(
      true,
    )
    expect(
      rows.some(({ name, lifted, opacity }) => name === 'Field' && lifted && opacity < 1),
    ).toBe(true)
    expect(rows.some(({ name, y, opacity }) => name === 'Loop' && y > 0 && opacity < 1)).toBe(true)
    expect(frames.every(({ versions }) => versions.length === 1)).toBe(true)

    await watch(page)
    await pick(page, 'CV', 'All')
    await expect(work(page).getByRole('status')).toHaveText('3 items')
    await page.waitForTimeout(600)
    const all = await seen(page)
    // Loop slides down as Field arrives before it, and the count deciphers.
    expect(all.some(({ rows }) => rows.some(({ name, y }) => name === 'Loop' && y < 0))).toBe(true)
    expect(all.some(({ cipher }) => cipher !== '')).toBe(true)
  })

  test('crossfades under reduced motion, and the count changes at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/work')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    await expect(work(page).getByRole('status')).toHaveText('3 items')

    await watch(page)
    await pick(page, 'All', 'Services')
    await expect(items(page)).toHaveCount(2)
    await page.waitForTimeout(600)
    const frames = await seen(page)
    expect(
      frames.some(({ versions }) => versions.length === 2 && versions[0] < 1 && versions[1] < 1),
    ).toBe(true)
    expect(frames.every(({ rows }) => rows.every(({ y }) => y === 0))).toBe(true)
    expect(frames.every(({ cipher }) => cipher === '')).toBe(true)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

    test('chooses in a drawer in front, as the window steps back', async ({ page }) => {
      await page.goto('/work')
      const window = page.locator('article[aria-label="Work"]')
      await window.getByRole('button', { name: 'All', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Filter' })).toBeVisible()
      await expect(window).toHaveAttribute('data-back', '1')

      await page.getByRole('menuitemradio', { name: 'CV' }).click()
      await expect(page.getByRole('dialog', { name: 'Filter' })).toBeHidden()
      await expect(window).not.toHaveAttribute('data-back', /[1-3]/)
      await expect(work(page).getByRole('status')).toHaveText('2 items')
    })
  })
})
