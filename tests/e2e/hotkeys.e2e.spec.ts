import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
const hotkeys = (page: Page) => win(page, 'Hotkeys')
const row = (page: Page, title: string) =>
  hotkeys(page).locator('.row:not(.list__head)').filter({ hasText: title })
const keep = (page: Page, name: string, value: string) =>
  page.addInitScript(([name, value]) => localStorage.setItem(name, value), [name, value])
const windowsDevice = (page: Page) =>
  page.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'Win32' }))

test.describe('The hotkeys window on a desk', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await windowsDevice(page)
    await emptyDesk(page)
  })

  test('lists the keys of the system and of the apps the windows carry, 400 px wide', async ({
    page,
  }) => {
    await page.goto('/hotkeys', { waitUntil: 'networkidle' })

    // What a reader sees: the device's names only.
    const rows = hotkeys(page).locator('.row:not(.list__head):visible')
    await expect(rows).toHaveCount(13)
    expect(
      await rows.evaluateAll((all) =>
        all.map((one) => (one as HTMLElement).innerText.replace(/\s+/g, ' ')),
      ),
    ).toEqual([
      'Hotkeys ?',
      'Search everything Ctrl K',
      'Preferences ,',
      'Work W',
      'Services S',
      'CV C',
      'Contact K',
      'Close, or leave full screen Esc',
      'Minimise to the taskbar, and bring back M',
      'Full screen, and back F',
      'Next window N',
      'Move, with the bar in focus Arrows',
      'Resize, with the bar in focus ⇧ Arrows',
    ])
    await expect(hotkeys(page).getByText('Not while you type in a field')).toBeVisible()
    expect((await hotkeys(page).boundingBox())!.width).toBe(400)
  })

  test('every key of the map lights its row for a moment', async ({ page }) => {
    await page.goto('/hotkeys', { waitUntil: 'networkidle' })

    for (const [key, title] of [
      ['?', 'Hotkeys'],
      [',', 'Preferences'],
      ['w', 'Work'],
      ['s', 'Services'],
      ['c', 'CV'],
      ['k', 'Contact'],
      ['n', 'Next window'],
      ['f', 'Full screen, and back'],
      ['f', 'Full screen, and back'],
      ['m', 'Minimise to the taskbar'],
      ['Escape', 'Close, or leave full screen'],
      ['Control+k', 'Search everything'],
    ]) {
      await page.keyboard.press(key)
      await expect(row(page, title)).toHaveAttribute('data-surface', 'inverted')
      await expect(row(page, title)).not.toHaveAttribute('data-surface')
      if (key === 'Control+k') await page.keyboard.press('Escape')
    }
  })

  test('every row does what its key does', async ({ page }) => {
    await page.goto('/hotkeys', { waitUntil: 'networkidle' })

    // Each window a row opens comes to the front, and ? brings this one back over it.
    for (const opens of ['Preferences', 'Work', 'Services', 'CV', 'Contact']) {
      await row(page, opens).click()
      await expect(win(page, opens)).toHaveAttribute('data-front', '')
      // Its view has arrived and holds the focus, so the next key acts on a settled desk.
      await expect
        .poll(() => win(page, opens).evaluate((one) => one.contains(document.activeElement)))
        .toBe(true)
      await page.keyboard.press('?')
      await expect(hotkeys(page)).toHaveAttribute('data-front', '')
    }
    await row(page, 'Hotkeys').click()
    await expect(hotkeys(page)).toHaveAttribute('data-front', '')

    await row(page, 'Search everything').click()
    await expect(page.getByRole('combobox')).toBeFocused()
    await page.keyboard.press('Escape')

    // The commands of a window act on the one in front, which is this one.
    await row(page, 'Next window').click()
    await expect(hotkeys(page)).not.toHaveAttribute('data-front', '')
    await page.keyboard.press('?')
    await row(page, 'Full screen, and back').click()
    await expect(hotkeys(page)).not.toHaveAttribute('data-full', '')
    await row(page, 'Minimise to the taskbar').click()
    await expect(hotkeys(page)).toBeHidden()
    await page.keyboard.press('?')
    await expect(hotkeys(page)).toHaveAttribute('data-front', '')
    await row(page, 'Close, or leave full screen').click()
    await expect(hotkeys(page)).toHaveCount(0)
  })

  test('says which rows are off with single keys off, and those keys do nothing', async ({
    page,
  }) => {
    await keep(page, 'shortcuts', 'off')
    await page.goto('/hotkeys', { waitUntil: 'networkidle' })

    const off = hotkeys(page).locator('.row').filter({ hasText: 'Single keys are off' })
    await expect(off).toHaveCount(9)
    for (const title of ['Search everything', 'Close, or leave full screen', 'Move, with']) {
      await expect(row(page, title)).not.toContainText('Single keys are off')
    }
    await page.keyboard.press('w')
    await expect(win(page, 'Work')).toHaveCount(0)
    await expect(row(page, 'Work')).not.toHaveAttribute('data-surface')
  })

  test('names the keys in German, which wrap to fit', async ({ page }) => {
    await page.goto('/de/hotkeys', { waitUntil: 'networkidle' })
    const window = win(page, 'Tastenkürzel')

    await expect(window.locator('.row').filter({ hasText: 'Alles durchsuchen' })).toContainText(
      'Strg',
    )
    await expect(window.locator('.row').filter({ hasText: 'Größe ändern' })).toContainText(
      '⇧Pfeiltasten',
    )
    await expect(window.getByText('Nicht, während Sie in ein Feld tippen')).toBeVisible()
    const body = window.locator('.window__body')
    expect(await body.evaluate((one) => one.scrollWidth <= one.clientWidth)).toBe(true)
  })
})

test.describe('The hotkeys window on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('is named Gestures and lists them instead of keys', async ({ page }) => {
    await page.goto('/hotkeys', { waitUntil: 'networkidle' })
    const gestures = win(page, 'Gestures')

    await expect(
      gestures.getByText('No keys on this device. A finger does the same.'),
    ).toBeVisible()
    await expect(gestures.locator('.row:visible')).toHaveCount(5)
    await expect(gestures.getByText('Dimm OS, in the menu bar')).toBeVisible()
    await expect(gestures.getByText('Search everything')).toBeHidden()
    await expect(page.locator('.dock')).toContainText('Gestures')
  })
})
