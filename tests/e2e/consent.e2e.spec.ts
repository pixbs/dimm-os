import type { Page } from '@playwright/test'

import { expect, test } from './test'

const consent = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('consent') ?? 'null'))
// What analytics would leave on the device: a cookie or a stored value of its own.
const analytics = (page: Page) =>
  page.evaluate(
    () =>
      document.cookie.includes('ph_') ||
      Object.keys(localStorage).some((key) => key.startsWith('ph_')),
  )

test.use({ asked: true, viewport: { width: 1440, height: 900 } })

test.describe('Consent', () => {
  test('asks a guest at the start, and a no is kept and asks no more', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const asking = page.locator('#window-cookies')

    // It stands in front of the windows that open at the start.
    await expect(asking).toHaveAttribute('data-front')
    await expect(asking).toContainText('PostHog, Inc., USA')
    await expect(asking.getByRole('link', { name: 'Cookies' })).toBeVisible()
    expect(await analytics(page)).toBe(false)

    await asking.getByRole('button', { name: 'Decline' }).click()
    await expect(asking).toHaveCount(0)
    expect((await consent(page)).on).toEqual([])
    expect(await analytics(page)).toBe(false)

    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('#window-cookies')).toHaveCount(0)
  })

  test.describe('after the boot', () => {
    test.use({ intro: true })

    test('asks in front of the windows of the start', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.keyboard.press('x')
      await expect(page.locator('.screen[data-waiting]')).toHaveCount(0)
      await expect(page.locator('#window-cookies')).toHaveAttribute('data-front')
    })
  })

  test('closing the window, or Esc, is a no', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.locator('#window-cookies').getByRole('button', { name: 'Close' }).click()
    expect((await consent(page)).on).toEqual([])

    await page.evaluate(() => localStorage.removeItem('consent'))
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('#window-cookies')).toBeVisible()
    await page.locator('#window-cookies').getByRole('heading', { level: 1 }).focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('#window-cookies')).toHaveCount(0)
    expect((await consent(page)).on).toEqual([])
  })

  test('a yes is kept with its version and date, and a changed registry asks again', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.locator('#window-cookies').getByRole('button', { name: 'Accept' }).click()
    const yes = await consent(page)
    expect(yes.on).toEqual(['analytics'])
    expect(Date.parse(yes.at)).toBeGreaterThan(Date.now() - 60_000)

    await page.evaluate(
      (kept) => localStorage.setItem('consent', JSON.stringify({ ...kept, version: 'before' })),
      yes,
    )
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('#window-cookies')).toBeVisible()
  })

  test('the details show one purpose at a time, and save what the switches say', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.locator('#window-cookies').getByRole('link', { name: 'Details' }).click()
    const details = page.locator('#window-cookies')
    await expect(
      details.getByRole('heading', { level: 1, name: 'Cookie preferences' }),
    ).toBeVisible()
    const pane = details.locator('.splitview__pane')
    await expect(pane).toContainText('Necessary')

    // The switch is pressed on its own: the pane keeps what it shows.
    await details.getByRole('switch', { name: 'Analytics' }).check()
    await expect(pane.getByRole('heading')).toHaveText('Necessary')
    await details.getByRole('button', { name: /Analytics/ }).click()
    await expect(pane).toContainText('PostHog, Inc.')

    await details.getByRole('button', { name: 'Save' }).click()
    expect((await consent(page)).on).toEqual(['analytics'])
  })

  test('a switch left unsaved is forgotten when the window closes', async ({ page }) => {
    await page.goto('/cookies/preferences', { waitUntil: 'networkidle' })
    const details = page.locator('#window-cookies')
    await details.getByRole('switch', { name: 'Analytics' }).check()
    await details.getByRole('button', { name: 'Close' }).click()
    await expect(details).toHaveCount(0)
    expect((await consent(page)).on).toEqual([])

    await page.getByRole('menubar').getByRole('menuitem', { name: 'Legal' }).click()
    await page
      .getByRole('menu', { name: 'Legal' })
      .getByRole('menuitem', { name: 'Cookies' })
      .click()
    await page.locator('#window-cookies').getByRole('link', { name: 'Details' }).click()
    await expect(details.getByRole('switch', { name: 'Analytics' })).not.toBeChecked()
  })
})
