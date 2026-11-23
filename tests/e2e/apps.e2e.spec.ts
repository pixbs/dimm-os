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

test.describe('Apps selected together', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('start', 'off'))
  })

  const shown = (page: Page) => page.locator('.apps > a.app:visible')
  const selected = (page: Page) => page.getByRole('option', { selected: true })
  // Draws the selection box from an empty cell beside the first column, a step to the right, to the nth app down it.
  async function box(page: Page, down: number) {
    const first = await at(shown(page).first())
    const last = await at(shown(page).nth(down - 1))
    await page.mouse.move(first.x + 104 + 60, first.y + 4)
    await page.mouse.down()
    await page.mouse.move(first.x + 40, last.y + 40, { steps: 6 })
    await expect(page.locator('.apps__box')).toBeVisible()
    await page.mouse.up()
  }

  test('a box selects the apps it touches, and Shift and a press adds one without opening it', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('listbox', { name: 'Apps' })).toHaveAttribute(
      'aria-multiselectable',
      'true',
    )
    await box(page, 3)
    await expect(selected(page)).toHaveCount(3)
    await expect(page.locator('.apps__box')).toHaveCount(0)
    const names = await shown(page).allTextContents()
    await expect(selected(page)).toHaveText(names.slice(0, 3))
    await expect(shown(page).nth(3)).toHaveAttribute('aria-selected', 'false')

    // A right click on an app not selected keeps the menu of one app and the selection.
    await shown(page).nth(3).click({ button: 'right' })
    await expect(page.locator('.menu__point [role=menu]').getByRole('menuitem')).toHaveText([
      'Open',
      'Copy link',
    ])
    await page.keyboard.press('Escape')
    await expect(selected(page)).toHaveCount(3)

    await shown(page)
      .nth(3)
      .click({ modifiers: ['Shift'] })
    await expect(selected(page)).toHaveText(names.slice(0, 4))
    await expect(page.locator('article')).toHaveCount(0)
    await expect(page).toHaveURL('/')
    await shown(page).first().click({ button: 'right' })
    await expect(page.locator('.menu__point [role=menu]').getByRole('menuitem')).toHaveText([
      'Open 4',
      'Copy links',
    ])
    await page.keyboard.press('Escape')
    await expect(selected(page)).toHaveCount(4)

    // A plain press on the empty desk selects none.
    const first = await at(shown(page).first())
    await page.mouse.click(first.x + 104 * 3, first.y + 4)
    await expect(selected(page)).toHaveCount(0)
  })

  for (const motion of ['reduce', 'no-preference'] as const)
    test(`move together into cells of their own, and Enter opens each a step off the one before, motion ${motion}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion })
      await page.goto('/', { waitUntil: 'networkidle' })
      await box(page, 4)
      await expect(selected(page)).toHaveCount(4)
      const four = await Promise.all([0, 1, 2, 3].map((nth) => at(shown(page).nth(nth))))

      const second = shown(page).nth(1)
      await carry(page, second, { x: four[1].x + 48 + 104 * 3, y: four[1].y + 32 })
      for (const [nth, was] of four.entries())
        await expect.poll(() => at(shown(page).nth(nth))).toEqual({ x: was.x + 104 * 3, y: was.y })
      const all = await shown(page).evaluateAll((apps) =>
        apps.map((one) => `${one.getBoundingClientRect().x} ${one.getBoundingClientRect().y}`),
      )
      expect(new Set(all).size).toBe(all.length)

      await second.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('article')).toHaveCount(4)
      // The last opened stands in front, with the focus and the address.
      const last = page.locator('article').last()
      await expect(last).toHaveAttribute('data-front')
      await page.waitForLoadState('networkidle')
      expect(await last.evaluate((one) => one.contains(document.activeElement))).toBe(true)
      expect(`window${new URL(page.url()).pathname.replaceAll('/', '-')}`).toBe(
        await last.getAttribute('id'),
      )
      // Each a step beside the one before, and down where it is not as high as the desk.
      const boxes = await page
        .locator('article')
        .evaluateAll((windows) => windows.map((one) => one.getBoundingClientRect().x))
      for (const nth of [1, 2, 3]) expect(boxes[nth]).toBeGreaterThan(boxes[nth - 1])
    })

  test('with keys alone: select all, move them a cell, select none', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const count = await shown(page).count()
    const before = await Promise.all(
      [...Array(count).keys()].map((nth) => at(shown(page).nth(nth))),
    )
    await shown(page).first().focus()
    await page.keyboard.press('ControlOrMeta+a')
    await expect(selected(page)).toHaveCount(count)
    await page.keyboard.press('Shift+ArrowRight')
    for (const [nth, was] of before.entries())
      await expect.poll(() => at(shown(page).nth(nth))).toEqual({ x: was.x + 104, y: was.y })
    await page.keyboard.press('Escape')
    await expect(selected(page)).toHaveCount(0)
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
