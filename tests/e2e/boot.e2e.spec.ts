import type { Page } from '@playwright/test'

import { expect, test } from './test'

const boot = (page: Page) => page.locator('.screen[data-waiting]')
const desk = (page: Page) => page.locator('.screen[data-fill]:not([data-waiting])')
const legal = ['Imprint', 'Privacy', 'Cookies']

// The legal menu at the end of the top bar, and no legal link in the bottom bar.
async function legalLinks(page: Page) {
  await expect(boot(page).locator('footer').getByRole('link', { name: 'Imprint' })).toBeHidden()
  await boot(page).locator('header').getByRole('button', { name: 'Legal' }).click()
  const rows = boot(page).getByRole('menu', { name: 'Legal' }).getByRole('menuitem')
  await expect(rows).toHaveText([...legal, 'Cookie preferences…'])
  await expect(rows.first()).toHaveAttribute('href', '/imprint')
  await page.keyboard.press('Escape')
  await expect(boot(page).getByRole('menu', { name: 'Legal' })).toHaveCount(0)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
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
    await expect(boot(page).getByText(/Field no\./)).toHaveCount(0)
    await legalLinks(page)
    await page.keyboard.press('x')
    await expect(boot(page)).toHaveCount(0)
    await expect(desk(page).getByRole('menuitem', { name: 'Legal' })).toBeVisible()
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

  test('search finds lock, intro and shut down under System, in either language, and Enter runs them', async ({
    page,
  }) => {
    const system = page.getByRole('group', { name: 'System', exact: true })
    await page.goto('/de', { waitUntil: 'networkidle' })
    await page.keyboard.press('x')
    await expect(boot(page)).toHaveCount(0)
    await page.keyboard.press('Control+k')
    for (const [typed, title] of [
      ['lock', 'Bildschirm sperren'],
      ['intro', 'Intro abspielen'],
      ['shut', 'Ausschalten'],
    ]) {
      await page.getByRole('combobox').fill(typed)
      await expect(system.getByRole('option')).toHaveCount(1)
      await expect(system.getByRole('option')).toContainText(title)
    }

    await page.goto('/imprint', { waitUntil: 'networkidle' })
    const run = async (typed: string, title: string) => {
      await page.keyboard.press('Control+k')
      await page.getByRole('combobox').fill(typed)
      await expect(page.getByRole('option')).toHaveCount(1)
      await expect(system.getByRole('option')).toContainText(title)
      await page.keyboard.press('Enter')
    }
    await run('lock', 'Lock screen')
    await expect(boot(page).getByRole('heading', { name: 'Guest' })).toBeVisible()
    await boot(page).getByRole('button', { name: 'Enter' }).click()
    await expect(boot(page)).toHaveCount(0)

    await run('intro', 'Replay intro')
    await expect(boot(page).getByText('Memory test')).toBeVisible()
    await page.keyboard.press('x')
    await expect(boot(page)).toHaveCount(0)

    await run('shut', 'Shut down')
    await expect(boot(page).getByText('It’s now safe to close this tab.')).toBeVisible()
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

test.describe('Lock screen on a phone', () => {
  test.use({ asked: true, viewport: { width: 390, height: 844 } })

  test('covers every drawer, the one in front too', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('#window-cookies')).toHaveAttribute('data-front')
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Dimm OS' }).click()
    await page
      .getByRole('dialog', { name: 'Dimm OS' })
      .getByRole('button', { name: 'Lock screen' })
      .click()
    await expect(boot(page)).toBeVisible()
    // Hit testing passes over what is inert, so the desk is let back in to find what lies on top.
    const covered = await page.evaluate(() => {
      document.querySelector('.screen[inert]')!.removeAttribute('inert')
      const box = document.querySelector('#window-cookies')!.getBoundingClientRect()
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      return Boolean(top?.closest('[data-waiting]'))
    })
    expect(covered).toBe(true)
  })
})
