import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const top = (page: Page, name: string) =>
  page.getByRole('menubar').getByRole('menuitem', { name, exact: true })
const menu = (page: Page, name: string) => page.getByRole('menu', { name, exact: true })
const win = (page: Page, name: string) => page.locator('article.window', { hasText: name })
const row = (page: Page, [first, name]: [string, string]) =>
  top(page, first)
    .click()
    .then(() => menu(page, first).getByRole('menuitem', { name, exact: true }))
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText())
const status = (page: Page) => page.locator('p[role=status][data-unseen]')
const taskbar = (page: Page) => page.locator('footer[data-for="desk"] .bar__text').first()

test.describe('The commands for the wallpaper, all windows and links', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  for (const [language, file, copy, copied] of [
    ['', 'File', 'Copy link', 'Link copied'],
    ['/de', 'Datei', 'Link kopieren', 'Link kopiert'],
  ] as const) {
    test(`Copy link puts the address of the window in front on the clipboard and says so${language && ', in German'}`, async ({
      page,
      baseURL,
    }) => {
      await page.goto(`${language}/work`, { waitUntil: 'networkidle' })
      await (await row(page, [file, copy])).click()
      await expect.poll(() => clipboard(page)).toBe(`${baseURL}${language}/work`)
      await expect(status(page)).toHaveText(copied)
      await expect(taskbar(page)).toHaveText(copied)
      // After two seconds the hint is back.
      await expect(status(page)).toHaveText('', { timeout: 4000 })
      await expect(taskbar(page)).not.toHaveText(copied)
    })
  }

  test('Open in new tab opens the address of the window in front in a tab of its own', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    const [tab] = await Promise.all([
      page.context().waitForEvent('page'),
      row(page, ['File', 'Open in new tab']).then((one) => one.click()),
    ])
    await expect(tab).toHaveURL(`${baseURL}/work`)
  })

  test('Download is the button at the foot of a file, and dimmed for any other window', async ({
    page,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await expect(await row(page, ['File', 'Download'])).toBeDisabled()
    await page.keyboard.press('Escape')

    await page.goto('/cv', { waitUntil: 'networkidle' })
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row(page, ['File', 'Download']).then((one) => one.click()),
    ])
    const foot = win(page, 'CV').locator('.window__main > .btngroup').getByRole('link').first()
    expect(new URL(download.url()).pathname).toBe(
      new URL((await foot.getAttribute('href'))!, download.url()).pathname,
    )
  })

  test('Minimise all and Close all act on every window, and cannot run with none open', async ({
    page,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await (await row(page, ['Legal', 'Imprint'])).click()
    await expect(page.locator('article.window')).toHaveCount(2)

    await (await row(page, ['Window', 'Minimise all windows'])).click()
    await expect(page.locator('article.window:visible')).toHaveCount(0)
    await expect(page).toHaveURL('/')
    await expect(await row(page, ['Window', 'Minimise all windows'])).toBeDisabled()
    await (await menu(page, 'Window').getByRole('menuitem', { name: 'Close all windows' })).click()
    await expect(page.locator('article.window')).toHaveCount(0)

    await expect(await row(page, ['Window', 'Minimise all windows'])).toBeDisabled()
    await expect(
      menu(page, 'Window').getByRole('menuitem', { name: 'Close all windows' }),
    ).toBeDisabled()
  })

  test('Next wallpaper keeps the filter and the colour', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wallpaper', 'koi ascii colour'))
    await page.goto('/work', { waitUntil: 'networkidle' })
    await (await row(page, ['View', 'Next wallpaper'])).click()
    await expect(page.locator('html')).toHaveAttribute('data-wallpaper', 'dragonflies ascii colour')
    await (await row(page, ['View', 'Next wallpaper'])).click()
    await expect(page.locator('html')).toHaveAttribute('data-wallpaper', 'contours ascii colour')
    await (await row(page, ['View', 'Next wallpaper'])).click()
    await expect(page.locator('html')).toHaveAttribute('data-wallpaper', 'catfish ascii')
  })

  test('search finds each under its name in both languages, and only where it can run', async ({
    page,
    baseURL,
  }) => {
    await emptyDesk(page)
    await page.goto('/de', { waitUntil: 'networkidle' })
    await page.keyboard.press('Control+k')
    await page.keyboard.type('Alle Fenster')
    await expect(page.getByRole('dialog').getByRole('option')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.keyboard.type('Hintergrund')
    await expect(
      page.getByRole('dialog').getByRole('option', { name: /Nächster Hintergrund/ }),
    ).toHaveCount(1)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    await page.goto('/work', { waitUntil: 'networkidle' })
    await page.keyboard.press('Control+k')
    await page.keyboard.type('kopieren')
    await expect(page.getByRole('dialog').getByRole('option')).toHaveText([/^Copy link/])
    await page.keyboard.press('Enter')
    await expect.poll(() => clipboard(page)).toBe(`${baseURL}/work`)
  })
})

test.describe('Copy link on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('is said to assistive technology, though a phone has no taskbar', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/work', { waitUntil: 'networkidle' })
    // The phone's menu holds no File menu: search runs the command.
    await page.locator('header').getByRole('button', { name: 'Search' }).click()
    await page.keyboard.type('Copy link')
    await expect(page.getByRole('dialog').getByRole('option')).toHaveText([/^Copy link/])
    await page.keyboard.press('Enter')
    await expect.poll(() => clipboard(page)).toBe(`${baseURL}/work`)
    await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toHaveCount(1)
  })
})
