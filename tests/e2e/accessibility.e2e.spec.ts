import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const win = (page: Page) => page.locator('article[aria-label="Accessibility"]')
const root = (page: Page, name: string) =>
  page.evaluate((name) => document.documentElement.dataset[name], name)
const toggle = (page: Page, name: RegExp) => win(page).getByRole('switch', { name })

test.describe('Accessibility', () => {
  test.use({ viewport: { width: 1280, height: 1100 } })

  test('stands at /accessibility with its specimen, says where it saves, and claims no conformance', async ({
    page,
  }) => {
    await page.goto('/accessibility', { waitUntil: 'networkidle' })
    const window = win(page)

    await expect(window.locator('.path, .bar').first()).toContainText('accessibility.sys')
    await expect(window.locator('.specimen')).toHaveAttribute('aria-hidden', 'true')
    await expect(window.getByText('Saved on this device only', { exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Reset' })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Done' })).toBeVisible()
    await expect(window).not.toContainText(/certif|conform|WCAG|BITV|EAA/i)
  })

  test('each setting acts on the whole screen at once, survives a reload, and Reset hands all back', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'no-preference' })
    await page.goto('/accessibility', { waitUntil: 'networkidle' })
    const settings: [RegExp, string, string][] = [
      [/^More contrast/, 'contrast', 'more'],
      [/^Plain wallpaper/, 'plain', 'on'],
      [/^Underline links/, 'underline', 'on'],
      [/^Wider text spacing/, 'spacing', 'wide'],
      [/^Reduce motion/, 'motion', 'reduce'],
      [/^Pause generated visuals/, 'pause', 'on'],
      [/^One window at a time/, 'single', 'on'],
    ]
    for (const [name, attribute, value] of settings) {
      await toggle(page, name).click()
      await expect.poll(() => root(page, attribute)).toBe(value)
    }
    await toggle(page, /^Single-key shortcuts/).click()
    expect(await root(page, 'shortcuts')).toBe('off')
    // The specimen says its visuals hold still.
    await expect(win(page).locator('.specimen')).toContainText('Visuals paused')

    await page.reload({ waitUntil: 'networkidle' })
    for (const [name, attribute, value] of settings) {
      expect(await root(page, attribute)).toBe(value)
      await expect(toggle(page, name)).toBeChecked()
    }
    expect(await root(page, 'shortcuts')).toBe('off')

    await win(page).getByRole('button', { name: 'Reset' }).click()
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({})
    // A crossfade writes the root once it has captured the screen before.
    await expect.poll(() => root(page, 'motion')).toBe('full')
    expect(await root(page, 'shortcuts')).toBe('on')
    await expect(win(page).locator('.tag', { hasText: 'System' })).toHaveCount(4)
  })

  test('reduce motion and pause start from what the device asks for, and can be changed', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/accessibility', { waitUntil: 'networkidle' })

    for (const name of [/^Reduce motion/, /^Pause generated visuals/]) {
      await expect(toggle(page, name)).toBeChecked()
      await expect(toggle(page, name)).toHaveAccessibleName(/System/)
    }
    await toggle(page, /^Reduce motion/).click()
    expect(await root(page, 'motion')).toBe('full')
    await expect(toggle(page, /^Reduce motion/)).not.toHaveAccessibleName(/System/)
  })

  test('with single-key shortcuts off, the hotkeys window says so', async ({ page }) => {
    await emptyDesk(page)
    await page.goto('/accessibility', { waitUntil: 'networkidle' })
    await toggle(page, /^Single-key shortcuts/).click()
    await page.goto('/hotkeys', { waitUntil: 'networkidle' })

    await expect(page.locator('article[aria-label="Hotkeys"]')).toContainText('Single keys are off')
  })
})
