import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'
import { travelled } from './travels'

const palette = (page: Page) => page.getByRole('dialog', { name: 'Search' })
const field = (page: Page) => page.getByRole('combobox')
const options = (page: Page) => page.getByRole('option')

test.describe('Search on a desk', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await emptyDesk(page)
  })

  test('opens with Ctrl K, narrows as the visitor types, says how many, and clears then closes with Esc', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const opener = page.locator('header').getByRole('button', { name: 'Theme', exact: true })
    await opener.focus()
    await page.keyboard.press('Control+k')

    await expect(field(page)).toBeFocused()
    await expect(field(page)).toHaveAttribute('placeholder', 'Search Dimm OS')
    await expect(field(page)).toHaveAccessibleName('Search Dimm OS')
    await expect(field(page)).toHaveAttribute('aria-expanded', 'true')
    const all = await options(page).count()
    await expect(palette(page).getByRole('status')).toHaveText(`${all} results`)
    for (const group of ['Work', 'Windows', 'System'])
      await expect(palette(page).getByRole('group', { name: group, exact: true })).toBeVisible()

    await page.keyboard.type('gro')
    await expect(options(page)).toHaveText([/^Grow\s*Case study/])
    await expect(options(page).first().locator('mark')).toHaveText('Gro')
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'true')
    await expect(field(page)).toHaveAttribute(
      'aria-activedescendant',
      (await options(page).first().getAttribute('id'))!,
    )
    await expect(palette(page).getByRole('status')).toHaveText('1 result')

    await page.keyboard.type('zzz')
    await expect(options(page)).toHaveCount(0)
    await expect(palette(page)).toContainText('Nothing matches “grozzz”. Try fewer letters.')

    await page.keyboard.press('Escape')
    await expect(field(page)).toHaveValue('')
    await expect(options(page)).toHaveCount(all)
    // The row in force stays in sight past the twelfth.
    for (let at = 1; at < all; at++) await page.keyboard.press('ArrowDown')
    await expect(options(page).last()).toHaveAttribute('aria-selected', 'true')
    await expect(options(page).last()).toBeInViewport()
    await page.keyboard.press('Escape')
    await expect(palette(page)).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('moves with the arrows, opens with Enter, and the window travels from its row', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.keyboard.press('Control+k')
    await page.keyboard.type('o')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    const row = options(page).nth(1)
    await expect(row).toHaveAttribute('aria-selected', 'true')
    await expect(row).toContainText('Loop')
    // The window sets off from its row, wherever the leaving palette has it by then, and lands in its place.
    const sets = page.evaluate(
      () =>
        new Promise<number[][]>((done) => {
          const rect = (one: Element) => {
            const { x, y, width, height } = one.getBoundingClientRect()
            return [x, y, width, height]
          }
          const seen = new MutationObserver(() => {
            const box = document.querySelector('[data-travels="flies"]')
            if (!box) return
            seen.disconnect()
            done([rect(box), rect(document.querySelector('[role=option][aria-selected=true]')!)])
          })
          seen.observe(document.body, { subtree: true, attributeFilter: ['data-travels'] })
        }),
    )
    await travelled(page, page.locator('#window-work'), () => page.keyboard.press('Enter'))
    const [box, from] = await sets
    box.forEach((side, at) => expect(Math.abs(side - from[at])).toBeLessThanOrEqual(1))
    await expect(palette(page)).toBeHidden()
    await expect(page).toHaveURL('/work/loop')
    const window = page.locator('article[data-front]')
    await expect(window.getByRole('heading', { name: 'Loop', level: 1 })).toBeVisible()
    await expect
      .poll(() => window.evaluate((one) => one.contains(document.activeElement)))
      .toBe(true)
  })

  test('opens a row by its number with Alt, and by a press on it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.keyboard.press('Control+k')
    await page.keyboard.type('o')
    const third = (await options(page).nth(2).locator('.row__title').textContent())!
    await expect(options(page).nth(2)).toContainText('Alt3')
    await page.keyboard.press('Alt+Digit3')
    await expect(palette(page)).toBeHidden()
    await expect(page.locator('article[data-front]')).toContainText(third)

    await page.locator('header').getByRole('button', { name: 'Search' }).first().click()
    await options(page).filter({ hasText: 'Contact' }).click()
    await expect(palette(page)).toBeHidden()
    await expect(page).toHaveURL('/contact')
  })

  test('opens from the search icon and from File, and a press beside it puts it away', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const icon = page.locator('header').getByRole('button', { name: 'Search' }).first()
    await icon.click()
    await expect(field(page)).toBeFocused()
    await page.mouse.click(1200, 700)
    await expect(palette(page)).toBeHidden()
    await expect(icon).toBeFocused()

    await page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Search/ }).click()
    await expect(field(page)).toBeFocused()
  })

  test('finds no hidden window for a guest, in either language', async ({ page }) => {
    for (const [address, words] of [
      ['/', ['Vault', 'Archive', 'Old notes', 'Tresor', 'Archiv', 'Alte Notizen']],
      ['/de', ['Tresor', 'Archiv', 'Alte Notizen', 'Vault', 'Archive', 'Old notes']],
    ] as const) {
      await page.goto(address, { waitUntil: 'networkidle' })
      expect(await page.content()).not.toMatch(/Vault|Tresor|Archive|Archiv|Old notes|Alte Notizen/)
      await page.keyboard.press('Control+k')
      for (const word of words) {
        await field(page).fill(word)
        await expect(options(page)).toHaveCount(0)
      }
    }
    await expect(field(page)).toHaveAccessibleName('Dimm OS durchsuchen')
    await expect(page.getByRole('dialog', { name: 'Suche' })).toContainText(
      'Nichts passt zu „Old notes“. Versuchen Sie es mit weniger Buchstaben.',
    )
    await field(page).fill('Fallstudie')
    await expect(options(page).first()).toContainText('Fallstudie')
  })
})

test.describe('Search on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('is a drawer with no keys, which its handle puts away', async ({ page }) => {
    await emptyDesk(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    const icon = page.locator('header').getByRole('button', { name: 'Search' }).last()
    await icon.click()

    await expect(palette(page)).toHaveAttribute('data-drawer', '')
    await expect(palette(page).locator('.kbd:visible')).toHaveCount(0)
    await expect(palette(page).getByRole('button', { name: 'Clear' })).toBeVisible()
    await page.keyboard.type('gro')
    await palette(page).getByRole('button', { name: 'Clear' }).click()
    await expect(field(page)).toHaveValue('')
    await palette(page).getByRole('button', { name: 'Close' }).click()
    await expect(palette(page)).toBeHidden()
  })
})
