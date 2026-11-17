import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
const front = (page: Page) => page.locator('article[data-front]')
const device = (page: Page, platform: 'MacIntel' | 'Win32') =>
  page.addInitScript((platform) => {
    Object.defineProperty(navigator, 'platform', { get: () => platform })
  }, platform)
// What the visitor chose in Preferences, as the device keeps it.
const keep = (page: Page, name: string, value: string) =>
  page.addInitScript(([name, value]) => localStorage.setItem(name, value), [name, value])
// Whether the desk took the last key pressed, so the browser does nothing with it.
const watch = (page: Page) =>
  page.evaluate(() =>
    addEventListener('keydown', (event) => Reflect.set(window, 'taken', event.defaultPrevented)),
  )
const taken = (page: Page) => page.evaluate(() => Reflect.get(window, 'taken') as boolean)
// Keeps what has the focus, and tells whether it still has it.
const hold = (page: Page) =>
  page.evaluate(() => Reflect.set(window, 'held', document.activeElement))
const held = (page: Page) =>
  page.evaluate(() => document.activeElement === Reflect.get(window, 'held'))

test.describe('Hotkeys on a desk', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const [platform, mod] of [
    ['Win32', 'Control'],
    ['MacIntel', 'Meta'],
  ] as const) {
    test(`every key of the map acts, with ${mod} K for search`, async ({ page }) => {
      await device(page, platform)
      await emptyDesk(page)
      await page.goto('/', { waitUntil: 'networkidle' })

      await page.keyboard.press('w')
      await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
      await expect(page).toHaveURL('/work')
      await page.keyboard.press('?')
      await expect(win(page, 'Hotkeys')).toHaveAttribute('data-front', '')
      await expect(page).toHaveURL('/hotkeys')
      await page.keyboard.press(',')
      await expect(win(page, 'Preferences')).toHaveAttribute('data-front', '')
      // Its view has arrived, and it has no heading, so it holds the focus itself: the next key acts on a settled desk.
      await expect(
        win(page, 'Preferences').getByRole('radiogroup', { name: 'Theme' }),
      ).toBeVisible()
      await expect(win(page, 'Preferences')).toBeFocused()

      await page.keyboard.press('n')
      await expect(front(page)).toHaveCount(1)
      await expect(win(page, 'Preferences')).not.toHaveAttribute('data-front', '')
      await page.keyboard.press('W')
      await page.keyboard.press('f')
      await expect(win(page, 'Work')).toHaveAttribute('data-full', '')
      await page.keyboard.press('F')
      await expect(win(page, 'Work')).not.toHaveAttribute('data-full', '')

      await page.keyboard.press('m')
      await expect(win(page, 'Work')).toBeHidden()
      await page.keyboard.press('Escape')
      await expect(page.locator('article')).toHaveCount(2)
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await expect(front(page)).toHaveCount(0)
      // With nothing in front, M brings back the one put away last.
      await page.keyboard.press('m')
      await expect(win(page, 'Work')).toHaveAttribute('data-front', '')

      // The key opens the palette, and Esc gives the focus back to what held it.
      await watch(page)
      await hold(page)
      // Only Work is left, once the windows closed have gone.
      await expect(page.locator('article')).toHaveCount(1)
      await page.keyboard.press(`${mod}+k`)
      expect(await taken(page)).toBe(true)
      await expect(page.getByRole('combobox')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('combobox')).toBeHidden()
      expect(await held(page)).toBe(true)
      await expect(page.locator('article')).toHaveCount(1)
    })
  }

  test('no key acts while the visitor types in a field, not even Esc or Ctrl K', async ({
    page,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    for (const html of ['<input>', '<textarea></textarea>', '<div contenteditable></div>']) {
      // At the top of the body, clear of the edge that resizes the window, however long its content.
      await page.evaluate((html) => {
        document.querySelector('#window-work .window__body')!.insertAdjacentHTML('afterbegin', html)
      }, html)
      const field = page.locator('#window-work .window__body > :first-child')
      await field.click()
      await page.keyboard.type('wm?,fn')
      for (const key of ['Escape', 'Control+k']) await page.keyboard.press(key)

      await expect(field).toBeFocused()
      await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
      await expect(page.locator('article')).toHaveCount(1)
      await expect(win(page, 'Work')).not.toHaveAttribute('data-full', '')
      expect(
        await field.evaluate((one) => (one as HTMLInputElement).value ?? one.textContent),
      ).toBe('wm?,fn')
    }
  })

  test('with single keys switched off, only Ctrl K and Esc act', async ({ page }) => {
    await keep(page, 'shortcuts', 'off')
    await page.goto('/work', { waitUntil: 'networkidle' })

    for (const key of ['?', ',', 'w', 'm', 'f', 'n']) await page.keyboard.press(key)
    await expect(page.locator('article')).toHaveCount(1)
    await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
    await expect(win(page, 'Work')).not.toHaveAttribute('data-full', '')

    await watch(page)
    await page.keyboard.press('Control+k')
    expect(await taken(page)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('combobox')).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page.locator('article')).toHaveCount(0)
  })

  test('a menu holds the keys, and none acts on what lies behind it', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click()
    for (const key of ['m', 'f', ',', 'w']) await page.keyboard.press(key)

    await expect(page.getByRole('menu', { name: 'View' })).toBeVisible()
    await expect(page.locator('article')).toHaveCount(1)
    await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
    await expect(win(page, 'Work')).not.toHaveAttribute('data-full', '')
  })

  test('Esc puts an open tooltip away before it closes the window', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    const button = page.locator('header').getByRole('button', { name: 'Theme', exact: true })
    await button.focus()
    await expect(button.locator('.tip')).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(button.locator('.tip')).toHaveCount(0)
    await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
    await page.keyboard.press('Escape')
    await expect(page.locator('article')).toHaveCount(0)
  })

  test('a menu takes Esc before the window does', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
  })
})

test.describe('The hotkeys hint in the taskbar', () => {
  const hint = (page: Page) => page.locator('footer[data-for="desk"] .bar__text')

  for (const [path, words, platform] of [
    ['/', 'Press ? for hotkeys', 'Win32'],
    ['/de', 'Drücken Sie ? für Tastenkürzel', 'MacIntel'],
  ] as const) {
    test(`reads "${words}"`, async ({ page }) => {
      await device(page, platform)
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto(path)

      await expect(hint(page)).toHaveText(words)
      await expect(hint(page).locator('kbd')).toHaveText('?')
    })
  }

  test('is not shown on a phone, nor under 960 px, nor with single keys off; on a phone the menu says Gestures', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(hint(page)).toBeHidden()
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Dimm OS' }).click()
    await expect(page.getByRole('menuitem', { name: 'Gestures' })).toBeVisible()

    // A desk under 960 px keeps its taskbar for the windows.
    await page.setViewportSize({ width: 959, height: 720 })
    await expect(page.locator('footer[data-for="desk"]')).toBeVisible()
    await expect(hint(page)).toBeHidden()
    await page.setViewportSize({ width: 960, height: 720 })
    await expect(hint(page)).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 720 })
    await keep(page, 'shortcuts', 'off')
    await page.reload()
    await expect(page.locator('footer[data-for="desk"]')).toBeVisible()
    await expect(hint(page)).toBeHidden()
  })
})

test.describe('The hotkeys hint to a finger', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 1194, height: 834 } })

  test('is not shown on a tablet, which has no keys', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer[data-for="desk"]')).toBeVisible()
    await expect(page.locator('footer[data-for="desk"] .bar__text')).toBeHidden()
  })
})
