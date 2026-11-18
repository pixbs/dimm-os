import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
const root = (page: Page, name: string) =>
  page.evaluate((name) => document.documentElement.dataset[name], name)
// What the settings stored, beside the answer to consent the harness gives every test.
const stored = (page: Page) =>
  page.evaluate(
    () => ({ ...localStorage, consent: undefined }) as Record<string, string | undefined>,
  )
const choose = (page: Page, group: string, option: string) =>
  win(page, 'Preferences').getByRole('radiogroup', { name: group }).getByText(option).click()

test.describe('Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 })
  })

  test('writes nothing until a setting changes; each change acts at once and survives a reload', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/preferences', { waitUntil: 'networkidle' })
    const prefs = win(page, 'Preferences')
    await expect(prefs.getByText('Follows your device: dark right now')).toBeVisible()
    await expect(prefs.getByText('Saved on this device only')).toBeVisible()
    expect(await stored(page)).toEqual({})

    await choose(page, 'Theme', 'Light')
    await choose(page, 'Dot', '12')
    await choose(page, 'Window controls', 'Windows')
    await choose(page, 'Clock', 'Yours')
    expect(await root(page, 'theme')).toBe('light')
    expect(await root(page, 'pitch')).toBe('12')
    expect(await root(page, 'hand')).toBe('squares')
    await expect(prefs.getByText('Where you are')).toBeVisible()
    expect(await stored(page)).toEqual({
      theme: 'light',
      pitch: '12',
      hand: 'squares',
      clock: 'yours',
    })

    await page.reload({ waitUntil: 'networkidle' })
    expect(await root(page, 'theme')).toBe('light')
    await expect(prefs.getByRole('radio', { name: '12' })).toBeChecked()
    await expect(prefs.getByText('Light, whatever your device says')).toBeVisible()

    // System hands the setting back to the device, and Reset hands back all of them.
    await choose(page, 'Theme', 'System')
    // A crossfade writes the root once it has captured the screen before.
    await expect.poll(() => root(page, 'theme')).toBe('dark')
    expect((await stored(page)).theme).toBeUndefined()
    // A choice the device already makes stays chosen.
    await choose(page, 'Theme', 'Dark')
    await expect(prefs.getByRole('radio', { name: 'Dark' })).toBeChecked()
    await expect(prefs.getByText('Dark, whatever your device says')).toBeVisible()
    expect((await stored(page)).theme).toBe('dark')
    await prefs.getByRole('button', { name: 'Reset' }).click()
    expect(await stored(page)).toEqual({})
    await expect.poll(() => root(page, 'pitch')).toBe('8')
    await expect(prefs.getByRole('radio', { name: 'System' }).first()).toBeChecked()
  })

  test('changes the screen where storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('blocked', 'SecurityError')
      }
    })
    await page.goto('/preferences', { waitUntil: 'networkidle' })
    await choose(page, 'Dot', '5')
    expect(await root(page, 'pitch')).toBe('5')
  })

  test('turns the wallpaper field by the dial, and plays the boot on the monitor', async ({
    page,
  }) => {
    await page.goto('/preferences', { waitUntil: 'networkidle' })
    const prefs = win(page, 'Preferences')
    const dial = prefs.getByRole('slider', { name: 'Wallpaper field' })
    await dial.press('ArrowRight')
    await dial.press('ArrowRight')
    expect(await root(page, 'wallpaper')).toBe('301')
    await expect(prefs.getByText('field no. 301')).toBeVisible()
    await dial.press('End')
    expect(await root(page, 'wallpaper')).toBe('999')

    const boot = prefs.getByRole('switch', { name: /Play the boot screen/ })
    await boot.click({ force: true })
    expect(await root(page, 'boot')).toBe('off')
    await boot.click({ force: true })
    await expect(prefs.locator('.monitor__boot')).toBeAttached()
    await expect(prefs.locator('.monitor__boot')).toHaveCount(0)
  })

  test('remembers windows: they come back in the taskbar where they stood, and load when brought back', async ({
    page,
  }) => {
    await emptyDesk(page)
    await page.goto('/preferences', { waitUntil: 'networkidle' })
    await win(page, 'Preferences')
      .getByRole('switch', { name: /Remember windows/ })
      .click({ force: true })
    await page.goto('/hello', { waitUntil: 'networkidle' })
    const places = JSON.parse((await stored(page)).places)
    expect(places.map((one: { at: string }) => one.at)).toContain('/hello')

    // Another tab of the device has a session of its own.
    const other = await page.context().newPage()
    await other.goto('/', { waitUntil: 'networkidle' })
    const task = other.getByRole('button', { name: 'hello' })
    await expect(task).toBeVisible()
    await expect(win(other, 'Hello')).toBeHidden()
    await task.press('Enter')
    await expect(win(other, 'Hello')).toHaveAttribute('data-front', '')
    await expect(win(other, 'Hello').locator('.window__view[data-view="/hello"]')).toBeVisible()

    await page.goto('/preferences', { waitUntil: 'networkidle' })
    await win(page, 'Preferences')
      .getByRole('switch', { name: /Remember windows/ })
      .click({ force: true })
    expect((await stored(page)).places).toBeUndefined()
  })

  test('opens no window at start when that is switched off', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('start', 'off'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('article.window')).toHaveCount(0)
  })

  test('loads the same address in the other language, and Done closes the window', async ({
    page,
  }) => {
    await page.goto('/preferences', { waitUntil: 'networkidle' })
    await choose(page, 'Language', 'Deutsch')
    await expect(page).toHaveURL('/de/preferences')
    await page.waitForLoadState('networkidle')
    const prefs = win(page, 'Einstellungen')
    await expect(prefs.getByRole('radiogroup', { name: 'Modus' })).toBeVisible()
    await prefs.getByRole('button', { name: 'Fertig' }).click()
    await expect(prefs).toHaveCount(0)
  })
})
