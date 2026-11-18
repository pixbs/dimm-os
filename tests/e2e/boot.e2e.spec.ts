import type { Page } from '@playwright/test'

import { expect, test } from './test'

const boot = (page: Page) => page.locator('.screen[data-waiting]')
const desk = (page: Page) => page.locator('.screen[data-fill]:not([data-waiting])')
const legal = ['Imprint', 'Privacy', 'Cookies']

async function legalLinks(page: Page) {
  for (const name of legal)
    await expect(boot(page).locator('footer').getByRole('link', { name })).toBeVisible()
}

test.describe('Boot, login and shut down', () => {
  test.use({ intro: true })
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('plays on the first visit to the desk, ends on any key, and not again in this tab', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(boot(page).getByText('Memory test')).toBeVisible()
    await expect(boot(page).getByText('Any key skips')).toBeVisible()
    await legalLinks(page)
    await page.keyboard.press('x')
    await expect(boot(page)).toHaveCount(0)
    await expect(desk(page).getByRole('link', { name: 'Imprint' })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('intro'))).toBe('played')

    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(boot(page)).toHaveCount(0)
  })

  test('hands over to the desk by itself once every row has passed', async ({ page }) => {
    await page.goto('/')
    await expect(boot(page).getByText('Device 3')).toBeVisible()
    await expect(boot(page)).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', /./)
  })

  test('never plays on a deep link, under reduced motion, or switched off', async ({ page }) => {
    await page.goto('/imprint', { waitUntil: 'networkidle' })
    await expect(boot(page)).toHaveCount(0)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(boot(page)).toHaveCount(0)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.evaluate(() => localStorage.setItem('boot', 'off'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(boot(page)).toHaveCount(0)
  })

  test('the login stands between the Guest button and the desk, and asks other users for their password', async ({
    page,
  }) => {
    await page.goto('/imprint', { waitUntil: 'networkidle' })
    await page.locator('header [data-visitor]').click()
    await expect(boot(page).getByRole('heading', { name: 'Guest' })).toBeVisible()
    await legalLinks(page)

    await boot(page).getByRole('button', { name: 'Other user…' }).click()
    await boot(page).getByRole('button', { name: 'Sign in' }).click()
    await expect(boot(page).getByText('Enter the password from your invite.')).toBeVisible()
    await boot(page).getByRole('button', { name: 'Back to Guest' }).click()

    await boot(page).getByRole('button', { name: 'Enter' }).click()
    await expect(boot(page)).toHaveCount(0)
    await expect(page.getByRole('article', { name: 'Imprint' })).toBeVisible()
  })

  test('locks from the system menu, and shuts down to a screen that turns on again', async ({
    page,
  }) => {
    await page.goto('/imprint', { waitUntil: 'networkidle' })
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Dimm OS' }).click()
    await page.getByRole('menuitem', { name: 'Lock screen' }).click()
    await expect(boot(page).getByRole('heading', { name: 'Guest' })).toBeVisible()

    await boot(page).getByRole('button', { name: 'Shut down' }).click()
    await expect(boot(page).getByText('It’s now safe to close this tab.')).toBeVisible()
    await legalLinks(page)

    await boot(page).getByRole('link', { name: 'Turn on' }).click()
    await expect(boot(page).getByText('Memory test')).toBeVisible()
  })

  test.describe('without script', () => {
    test.use({ javaScriptEnabled: false })

    test('the desk is there at /, with the legal links', async ({ page }) => {
      await page.goto('/')
      await expect(boot(page)).toHaveCount(0)
      for (const name of legal) await expect(page.getByRole('link', { name }).first()).toBeVisible()
    })
  })
})
