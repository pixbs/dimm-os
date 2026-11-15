import type { Page } from '@playwright/test'

import { expect, test } from './test'

// The device the page reads, before any of its own script runs.
const device = (page: Page, platform: 'MacIntel' | 'Win32') =>
  page.addInitScript((platform) => {
    Object.defineProperty(navigator, 'platform', { get: () => platform })
  }, platform)

const entry = (page: Page, name: string) =>
  page.locator('.entry', { has: page.getByRole('heading', { name, exact: true }) })

test.describe('Actions', () => {
  test('shows the window controls in one hand: the setting, or the device under System', async ({
    page,
  }) => {
    await device(page, 'MacIntel')
    await page.goto('/catalogue/actions')
    // The last bar shows no hand of its own; the others each show the one their caption names.
    const free = page.locator('.stage:not([data-hand]) .strip')
    await expect(free.locator('.wctl[data-shape="dots"]')).toBeVisible()
    await expect(free.locator('.wctl[data-shape="squares"]')).toBeHidden()
    await expect(
      page.locator('[data-hand="squares"] .wctl[data-shape="dots"]').first(),
    ).toBeHidden()

    await page
      .locator('.doc__sets span', { hasText: 'hand' })
      .getByRole('button', { name: 'squares' })
      .click()
    await expect(free.locator('.wctl[data-shape="squares"]')).toBeVisible()
    await expect(free.locator('.wctl[data-shape="dots"]')).toBeHidden()
    await expect(page.locator('[data-hand="dots"] .wctl[data-shape="dots"]').first()).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(free.locator('.wctl[data-shape="dots"]')).toBeVisible()
  })

  test('follows a device that is not Apple: squares, and Ctrl or Strg', async ({ page }) => {
    await device(page, 'Win32')
    await page.goto('/de/catalogue/actions')

    await expect(page.locator('.stage:not([data-hand]) .wctl[data-shape="squares"]')).toBeVisible()
    await expect(entry(page, 'Taste').locator('.keys').first()).toHaveText(/^Strg\s*K$/, {
      useInnerText: true,
    })
  })

  test('names keys as the device does, in English and German', async ({ page }) => {
    await device(page, 'MacIntel')
    for (const [language, name] of [
      ['', 'Key'],
      ['/de', 'Taste'],
    ]) {
      await page.goto(`${language}/catalogue/actions`)
      const keys = entry(page, name)

      await expect(keys.locator('.keys').first()).toHaveText(/^⌘\s*K$/, { useInnerText: true })
      // On paper the specimen shows how another device names them.
      await expect(keys.locator('[data-keys="other"] .keys')).toHaveText(
        language ? /^Strg\s*K$/ : /^Ctrl\s*K$/,
        { useInnerText: true },
      )
      // The table names every key on both devices.
      await expect(keys.locator('.dl')).toContainText('Apple⌘⌥⇧↵↑↓←→Esc')
      await expect(keys.locator('.dl')).toContainText(
        language ? 'AndereStrgAlt⇧↵↑↓←→Esc' : 'OthersCtrlAlt⇧↵↑↓←→Esc',
      )
    }
  })

  test('shows a tooltip within fast and puts it away within half of it, or at once with Esc', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/catalogue/actions', { waitUntil: 'networkidle' })
    const button = page.getByRole('button', { name: 'Preferences' })
    const tip = button.locator('.tip')
    const timing = () =>
      button.locator('.tip-at > *').evaluate((part) => {
        const timing = part.getAnimations()[0]?.effect?.getTiming()
        return [timing?.duration, timing?.easing]
      })

    await button.hover()
    await expect(tip).toHaveText('Preferences,')
    await expect.poll(timing).toEqual([160, 'cubic-bezier(0, 0, 0, 1)'])
    await page.mouse.move(0, 0)
    await expect.poll(timing).toEqual([80, 'cubic-bezier(0.3, 0, 1, 1)'])
    await expect(tip).toHaveCount(0)

    // Reached by keys it names the button too, and Esc puts it away.
    await button.focus()
    await expect(tip).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tip).toHaveCount(0)
  })

  test('fades a tooltip in place with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/catalogue/actions', { waitUntil: 'networkidle' })
    const button = page.getByRole('button', { name: 'Preferences' })
    // The scale of the tooltip on every frame while it appears.
    await page.evaluate(() => {
      const scales: number[] = []
      Object.assign(window, { scales })
      requestAnimationFrame(function look() {
        const part = document.querySelector('.tip-at > *')
        if (part) scales.push(new DOMMatrix(getComputedStyle(part).transform).a)
        requestAnimationFrame(look)
      })
    })

    await button.hover()
    await expect(button.locator('.tip')).toHaveCSS('opacity', '1')
    const scales = await page.evaluate(() => Reflect.get(window, 'scales') as number[])
    expect(scales.length).toBeGreaterThan(0)
    expect(new Set(scales)).toEqual(new Set([1]))
  })

  test('wraps long German labels in every action, and cuts none', async ({ page }) => {
    await page.goto('/de/catalogue/actions')
    await page.evaluate(() => document.fonts.ready)

    // Nothing reaches past what holds it, and nothing is drawn with an ellipsis.
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.btn, .btn__label, .tag, .tip, .kbd')]
        .filter((part) => part.checkVisibility())
        .filter(
          (part) =>
            part.scrollWidth > part.clientWidth ||
            getComputedStyle(part).textOverflow === 'ellipsis',
        )
        .map((part) => part.textContent),
    )
    expect(cut).toEqual([])

    for (const label of ['Bewegung reduzieren', 'Anderes Konto…', 'Kontrast erhöhen']) {
      const box = (await page.locator('.btn__label', { hasText: label }).first().boundingBox())!
      expect(box.height, label).toBeGreaterThan(24)
    }
    const tag = (await page.locator('.tag', { hasText: 'Bildschirm sperren' }).boundingBox())!
    expect(tag.height).toBeGreaterThan(24)
  })

  test('stacks a group of actions in a compact window', async ({ page }) => {
    await page.goto('/catalogue/actions')
    const groups = entry(page, 'Button group').locator('.btngroup:not([data-width])')
    const top = (group: number, cell: number) =>
      groups
        .nth(group)
        .locator('.btn')
        .nth(cell)
        .evaluate((cell) => cell.getBoundingClientRect().top)

    expect(await top(0, 1)).toBe(await top(0, 0))
    expect(await top(1, 1)).toBeGreaterThan(await top(1, 0))
  })

  test('draws a key hint at full strength on an accent, and muted on the desktop', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/catalogue/actions')
    const onAccent = page.locator('[data-surface="orange"] > .btn .btn__key')
    const onDesktop = page.locator('.stack > .btn .btn__key').first()

    await expect(onAccent).toHaveCSS('color', 'rgb(14, 14, 16)')
    await expect(onDesktop).toHaveCSS('color', /\/ 0\.64\)$/)
  })
})
