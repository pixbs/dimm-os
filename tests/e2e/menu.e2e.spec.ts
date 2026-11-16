import type { Page } from '@playwright/test'

import { expect, test } from './test'

const top = (page: Page, name: string) =>
  page.getByRole('menubar').getByRole('menuitem', { name, exact: true })
const menu = (page: Page, name: string) => page.getByRole('menu', { name, exact: true })
const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
// What has the focus: its title, and the key it shows.
const focused = (page: Page) =>
  page.evaluate(() => {
    const at = document.activeElement as HTMLElement
    const shown = (part: string) => (at.querySelector(part) as HTMLElement | null)?.innerText ?? ''
    return { title: shown('.row__title') || at.innerText, key: shown('.row__meta') }
  })

// The key each command shows, on a device that is not Apple's.
const keys: Record<string, string> = {
  Preferences: ',',
  Hotkeys: '?',
  Search: 'Ctrl K',
  'Close window': 'Esc',
  'Full screen': 'F',
  Minimise: 'M',
  'Next window': 'N',
}

// Choose a row with the pointer: a menu of the menu bar, then a row of it or of one of its submenus.
async function pick(page: Page, [first, ...rows]: string[]) {
  await top(page, first).click()
  let within = first
  for (const row of rows) {
    await menu(page, within).getByText(row, { exact: true }).first().click()
    within = row
  }
}

test.describe('Menus on a desk', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
  })

  test('every menu opens and is walked with keys alone, and each row shows its key', async ({
    page,
  }) => {
    // The menu bar is one stop of the keyboard, after the link that skips to the window.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    for (const name of ['Dimm OS', 'File', 'View', 'Window', 'Help']) {
      await expect(top(page, name)).toBeFocused()
      await page.keyboard.press('ArrowDown')
      const count = await menu(page, name).evaluate(
        (list) =>
          list.querySelectorAll(
            ':scope > [role^=menuitem]:not(:disabled), :scope > * > [role^=menuitem]:not(:disabled)',
          ).length,
      )
      expect(count).toBeGreaterThan(0)
      const seen = []
      for (let at = 0; at < count; at++) {
        seen.push(await focused(page))
        await page.keyboard.press('ArrowDown')
      }
      // The arrows go round, and every row with a key shows it.
      expect(await focused(page)).toEqual(seen[0])
      for (const { title, key } of seen) expect(key).toBe(keys[title] ?? '')
      // Esc closes the menu and gives the focus back to its button; Right goes to the next.
      await page.keyboard.press('Escape')
      await expect(menu(page, name)).toHaveCount(0)
      await expect(top(page, name)).toBeFocused()
      await page.keyboard.press('ArrowRight')
    }
    await expect(top(page, 'Dimm OS')).toBeFocused()
  })

  test('Right and Left go to the menu beside, Right opens a submenu, and Tab stays in the menu', async ({
    page,
  }) => {
    await top(page, 'View').focus()
    await page.keyboard.press('ArrowUp')
    expect((await focused(page)).title).toBe('Dot')
    await page.keyboard.press('ArrowRight')
    await expect(menu(page, 'Dot')).toBeVisible()
    expect((await focused(page)).title).toBe('5')
    await page.keyboard.press('ArrowLeft')
    await expect(menu(page, 'Dot')).toHaveCount(0)
    expect((await focused(page)).title).toBe('Dot')
    await page.keyboard.press('Tab')
    expect((await focused(page)).title).toBe('Full screen')
    await page.keyboard.press('ArrowLeft')
    await expect(menu(page, 'File')).toBeVisible()
    await expect(menu(page, 'View')).toHaveCount(0)
    expect((await focused(page)).title).toBe('Close window')
    // A press outside closes it.
    await page.mouse.click(700, 500)
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('each command acts', async ({ page }) => {
    const work = win(page, 'Work')
    const root = page.locator('html')
    await page.getByRole('link', { name: 'Imprint' }).click()
    await expect(win(page, 'Imprint')).toHaveAttribute('data-front', '')

    await pick(page, ['Window', 'Next window'])
    await expect(work).toHaveAttribute('data-front', '')
    await pick(page, ['Window', 'Move & Resize', 'Left half'])
    const desk = (await page.locator('.screen__desk').boundingBox())!
    await expect.poll(async () => (await work.boundingBox())!.x).toBe(desk.x)
    await pick(page, ['View', 'Full screen'])
    await expect(work).toHaveAttribute('data-full', '')
    await pick(page, ['View', 'Full screen'])
    await expect(work).not.toHaveAttribute('data-full', '')

    const theme = await root.getAttribute('data-theme')
    await pick(page, ['View', 'Theme'])
    await expect(root).not.toHaveAttribute('data-theme', theme!)
    await pick(page, ['View', 'Dot', '12'])
    await expect(root).toHaveAttribute('data-pitch', '12')

    await pick(page, ['Window', 'Minimise'])
    await expect(work).toBeHidden()
    await pick(page, ['Window', 'work'])
    await expect(work).toHaveAttribute('data-front', '')
    await pick(page, ['File', 'Close window'])
    await expect(work).toHaveCount(0)

    await pick(page, ['Dimm OS', 'Preferences'])
    await expect(win(page, 'Preferences')).toHaveAttribute('data-front', '')
    await top(page, 'Help').click()
    for (const [name, path] of [
      ['Hotkeys', '/hotkeys'],
      ['Accessibility', '/accessibility'],
      ['About Dimm OS', '/about'],
      ['Imprint', '/imprint'],
      ['Privacy', '/privacy-policy'],
      ['Cookies', '/cookies'],
    ]) {
      await expect(menu(page, 'Help').getByRole('menuitem', { name })).toHaveAttribute('href', path)
    }
  })

  test('a menu unfolds from the edge it hangs from within fast, and fades with reduced motion', async ({
    page,
  }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion: motion })
      await page.reload({ waitUntil: 'networkidle' })
      await page.evaluate(() => {
        const seen: [number, number, number][] = []
        Object.assign(window, { seen })
        const start = performance.now()
        requestAnimationFrame(function look() {
          const part = document.querySelector('.menu__hang')
          if (part) {
            const { d } = new DOMMatrix(getComputedStyle(part).transform)
            seen.push([performance.now() - start, d, +getComputedStyle(part).opacity])
          }
          requestAnimationFrame(look)
        })
      })
      await top(page, 'File').click()
      await expect(menu(page, 'File')).toBeVisible()
      await page.waitForTimeout(400)
      const seen = (await page.evaluate(() => Reflect.get(window, 'seen'))) as number[][]
      const first = seen[0]
      const arrived = seen.find(([, scale, opacity]) => scale === 1 && opacity === 1)!
      expect(arrived[0] - first[0]).toBeLessThanOrEqual(160 + 34)
      if (motion === 'reduce') expect(seen.every(([, scale]) => scale === 1)).toBe(true)
      else expect(first[1]).toBeLessThan(0.5)
      expect(
        await page
          .locator('.menu__hang')
          .evaluate((part) => getComputedStyle(part).transformOrigin),
      ).toMatch(/ 0px$/)
    }
  })
})

test.describe('Menus on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  for (const [language, names] of [
    ['', ['Dimm OS', 'Window', 'Imprint', 'Privacy', 'Cookies']],
    ['/de', ['Dimm OS', 'Fenster', 'Impressum', 'Datenschutz', 'Cookies']],
  ] as const) {
    test(`the system menu is a modal drawer that holds the menus and ends with the legal rows${language && ', in German'}`, async ({
      page,
    }) => {
      const [system, windows, ...legal] = names
      for (const name of legal) {
        await page.goto(`${language}/work`, { waitUntil: 'networkidle' })
        await top(page, system).click()
        const drawer = page.locator('dialog', { has: menu(page, system) })
        await expect(drawer).toHaveJSProperty('open', true)
        expect(await drawer.evaluate((dialog) => dialog.matches(':modal'))).toBe(true)
        // The window behind steps back, and the rows end with the three legal links.
        await expect(page.locator('article.window[data-back="1"]')).toHaveCount(1)
        const last = await menu(page, system).evaluate((list) =>
          [
            ...list.querySelectorAll<HTMLElement>(
              ':scope > [role=menuitem], :scope > * > [role=menuitem]',
            ),
          ]
            .slice(-3)
            .map((row) => row.innerText),
        )
        expect(last).toEqual(legal)
        // A submenu goes in front, and Esc puts it away first, the focus back on its row.
        await menu(page, system).getByRole('menuitem', { name: windows }).click()
        await expect(menu(page, windows)).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(menu(page, windows)).toHaveCount(0)
        await expect(menu(page, system).getByRole('menuitem', { name: windows })).toBeFocused()

        await menu(page, system).getByRole('menuitem', { name, exact: true }).click()
        await expect(page.locator('dialog')).toHaveCount(0)
        await expect(win(page, name)).toHaveAttribute('data-front', '')
      }
    })
  }

  test('Esc closes the system menu and the focus returns to its button', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await top(page, 'Dimm OS').click()
    await expect(menu(page, 'Dimm OS').getByRole('menuitem').first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(top(page, 'Dimm OS')).toBeFocused()
  })
})

test.describe('Dialog', () => {
  test('is modal: the focus moves in and stays in, Esc closes it and the focus returns', async ({
    page,
  }) => {
    await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
    const opener = page.getByRole('button', { name: 'Open the dialog' })
    await page.evaluate(() => {
      const seen: number[] = []
      Object.assign(window, { seen })
      requestAnimationFrame(function look() {
        const frame = document.querySelector('dialog:modal .dialog__frame')
        if (frame) seen.push(new DOMMatrix(getComputedStyle(frame).transform).a)
        requestAnimationFrame(look)
      })
    })
    await opener.click()
    const dialog = page.locator('dialog:modal')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
    // It comes from 96 % at its own place.
    await page.waitForTimeout(300)
    const seen = (await page.evaluate(() => Reflect.get(window, 'seen'))) as number[]
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0.96)
    expect(seen.at(-1)).toBe(1)
    // What lies behind cannot be reached: Tab goes round the dialog.
    for (let press = 0; press < 4; press++) {
      await page.keyboard.press('Tab')
      expect(
        await page.evaluate(
          () =>
            !document.activeElement?.closest('body *') ||
            !!document.activeElement.closest('dialog:modal'),
        ),
      ).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test('the catalogue entries are drawn at the sizes of the system', async ({ page }) => {
    await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
    const size = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((part) => {
          const { width, height } = part.getBoundingClientRect()
          return [width, height]
        })
    expect(await size('.menu[data-surface] .row[data-size="compact"]')).toEqual([192, 32])
    expect((await size('.menu[data-surface] .row:not([data-size])'))[1]).toBe(48)
    expect((await size('.dialog:not([data-drawer]) .dialog__frame'))[0]).toBe(480)
    expect((await size('.notice'))[0]).toBe(320)
  })
})
