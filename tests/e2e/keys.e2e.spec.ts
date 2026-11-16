import type { Page } from '@playwright/test'

import { expect, test } from './test'

const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
const front = (page: Page) => page.locator('article[data-front]')
const device = (page: Page, platform: 'MacIntel' | 'Win32') =>
  page.addInitScript((platform) => {
    Object.defineProperty(navigator, 'platform', { get: () => platform })
  }, platform)
// What the visitor chose in Preferences, as the device keeps it.
const keep = (page: Page, name: string, value: string) =>
  page.addInitScript(([name, value]) => localStorage.setItem(name, value), [name, value])

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
      await page.goto('/', { waitUntil: 'networkidle' })

      await page.keyboard.press('w')
      await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
      await expect(page).toHaveURL('/work')
      await page.keyboard.press('?')
      await expect(win(page, 'Hotkeys')).toHaveAttribute('data-front', '')
      await expect(page).toHaveURL('/hotkeys')
      await page.keyboard.press(',')
      await expect(win(page, 'Preferences')).toHaveAttribute('data-front', '')

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

      // Until the palette arrives, the key finds the button that will open it.
      await page.keyboard.press(`${mod}+k`)
      await expect(page.getByRole('button', { name: 'Search' }).first()).toBeFocused()
    })
  }

  test('no key acts while the visitor types in a field, not even Esc or Ctrl K', async ({
    page,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    for (const html of ['<input>', '<textarea></textarea>', '<div contenteditable></div>']) {
      await page.evaluate((html) => {
        document.querySelector('#window-work .window__body')!.insertAdjacentHTML('beforeend', html)
      }, html)
      const field = page.locator('#window-work .window__body > :last-child')
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

    await page.keyboard.press('Control+k')
    await expect(page.getByRole('button', { name: 'Search' }).first()).toBeFocused()
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
