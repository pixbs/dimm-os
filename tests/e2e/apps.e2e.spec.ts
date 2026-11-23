import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

const app = (page: Page, name: string) =>
  page.locator('.apps > a.app[data-for="desk"], .apps > a.app:not([data-for])', { hasText: name })
const at = async (one: Locator) => {
  const box = (await one.boundingBox())!
  return { x: Math.round(box.x), y: Math.round(box.y) }
}

// Carries an app by its tile to a point of the screen, in steps the way a hand moves.
async function carry(page: Page, one: Locator, to: { x: number; y: number }) {
  const box = (await one.locator('.app__tile').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

test.describe('Apps on a desk', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  // An empty desk, so every cell can be reached.
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('start', 'off'))
  })

  test('are carried to a free cell and stay, and a plain press still opens one', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = app(page, 'Work')
    const services = app(page, 'Services')
    const was = await at(services)
    const from = await at(work)

    await carry(page, work, { x: from.x + 48 + 104 * 3, y: from.y + 32 + 104 * 2 })
    await expect.poll(() => at(work)).toEqual({ x: from.x + 104 * 3, y: from.y + 104 * 2 })
    expect(await at(services)).toEqual(was)
    await expect(page.locator('.apps__spot')).toHaveCount(0)
    await expect(page).toHaveURL('/')
    expect(await page.evaluate(() => getSelection()?.toString())).toBe('')

    await work.click()
    await expect(page.locator('#window-work')).toBeVisible()
  })

  test('dropped on another app land in the nearest free cell, and no two share one', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = app(page, 'Work')
    const services = app(page, 'Services')
    const below = await at(services)
    await carry(page, work, { x: below.x + 48, y: below.y + 32 })

    await expect.poll(() => at(work)).not.toEqual(below)
    const all = await page
      .locator('.apps > a.app:visible')
      .evaluateAll((apps) =>
        apps.map((one) => `${one.getBoundingClientRect().x} ${one.getBoundingClientRect().y}`),
      )
    expect(new Set(all).size).toBe(all.length)
  })

  test('move a cell with Shift and an arrow, and Clean up brings them back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = app(page, 'Work')
    const from = await at(work)
    await work.focus()
    for (let step = 0; step < 3; step++) await page.keyboard.press('Shift+ArrowRight')
    await expect.poll(() => at(work)).toEqual({ x: from.x + 104 * 3, y: from.y })
    await expect(work).toBeFocused()

    await page.getByRole('menubar').getByRole('menuitem', { name: 'View' }).click()
    await page.getByRole('menuitem', { name: 'Clean up' }).click()
    await expect.poll(() => at(work)).toEqual(from)
  })

  test('stand as at the start after a reload, unless windows are remembered', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = app(page, 'Work')
    const from = await at(work)
    await work.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect.poll(() => at(work)).not.toEqual(from)
    await page.reload({ waitUntil: 'networkidle' })
    await expect.poll(() => at(work)).toEqual(from)

    await page.evaluate(() => localStorage.setItem('remember', 'on'))
    await page.reload({ waitUntil: 'networkidle' })
    await work.focus()
    await page.keyboard.press('Shift+ArrowRight')
    const moved = { x: from.x + 104, y: from.y }
    await expect.poll(() => at(work)).toEqual(moved)
    await page.reload({ waitUntil: 'networkidle' })
    await expect.poll(() => at(work)).toEqual(moved)
  })
})

test.describe('Apps on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('stand in their grid and do not move', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = page.locator('.apps > a.app', { hasText: 'Work' }).first()
    const from = await at(work)
    await work.focus()
    await page.keyboard.press('Shift+ArrowRight')
    expect(await at(work)).toEqual(from)
    await expect(page.locator('.apps[data-moves]')).toHaveCount(0)
  })
})
