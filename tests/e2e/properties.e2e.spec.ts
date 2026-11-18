import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
const keep = (page: Page, name: string, value: string) =>
  page.addInitScript(([name, value]) => localStorage.setItem(name, value), [name, value])
const foot = (page: Page, name: string) => win(page, name).locator('.window__main > .btngroup')

test.describe('Window properties on a desk', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('paper draws a record opened by its stamp, with buttons at its foot', async ({ page }) => {
    await page.goto('/cv', { waitUntil: 'networkidle' })
    const cv = win(page, 'CV')

    await expect(cv.locator('.window__frame')).toHaveAttribute('data-surface', 'paper')
    await expect(cv.locator('.record__stamp')).toContainText('FIX/CV.01')
    await expect(cv.locator('.record__stamp')).toContainText('Somewhere')
    // A file downloads; a link to a window opens it here.
    const buttons = foot(page, 'CV').getByRole('link')
    await expect(buttons.locator('.btn__label')).toHaveText(['Download', 'Write'])
    await expect(buttons.last()).toHaveAccessibleName('Write')
    await expect(buttons.first()).toHaveAttribute('download')
    await buttons.last().click()
    await expect(win(page, 'Contact')).toHaveAttribute('data-front', '')
    await expect(page).toHaveURL('/contact')

    // A window with neither stamp nor paper has neither.
    await page.goto('/work', { waitUntil: 'networkidle' })
    await expect(win(page, 'Work').locator('.window__frame')).toHaveAttribute(
      'data-surface',
      'window',
    )
    await expect(win(page, 'Work').locator('.record__stamp')).toHaveCount(0)
  })

  test('opens at the size it is given, clamped to the desk', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'networkidle' })
    await expect.poll(async () => (await win(page, 'Contact').boundingBox())?.width).toBe(640)
    expect((await win(page, 'Contact').boundingBox())!.height).toBe(512)

    await page.goto('/cv', { waitUntil: 'networkidle' })
    const desk = (await page.locator('.screen__desk').boundingBox())!
    await expect.poll(async () => (await win(page, 'CV').boundingBox())?.height).toBe(desk.height)
  })

  test('of one size has no full screen and nothing to pull', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'networkidle' })
    const contact = win(page, 'Contact')

    await expect(contact.locator('.window__grip, .window__edge')).toHaveCount(0)
    await expect(contact.getByRole('button', { name: 'Full screen' })).toBeDisabled()
    await contact.locator('.window__bar').dblclick()
    await page.keyboard.press('f')
    await expect(contact).not.toHaveAttribute('data-full')
  })

  test('shows a button to a window by that window’s title and key, and the key opens it', async ({
    page,
  }) => {
    await emptyDesk(page)
    await page.goto('/welcome', { waitUntil: 'networkidle' })
    const work = foot(page, 'Welcome').getByRole('link', { name: 'Work' })

    await expect(work.locator('.btn__key')).toBeVisible()
    await expect(work.locator('.btn__key')).toHaveText('W')
    await expect(work.locator('.icon')).toBeHidden()
    await page.keyboard.press('w')
    await expect(win(page, 'Work')).toHaveAttribute('data-front', '')
  })

  test('with single keys off, a window’s letter neither shows nor opens it', async ({ page }) => {
    await keep(page, 'shortcuts', 'off')
    await emptyDesk(page)
    await page.goto('/welcome', { waitUntil: 'networkidle' })
    const work = foot(page, 'Welcome').getByRole('link', { name: 'Work' })

    await expect(work.locator('.btn__key')).toBeHidden()
    await expect(work.locator('.icon')).toBeVisible()
    await page.keyboard.press('w')
    await expect(win(page, 'Work')).toHaveCount(0)
  })

  test('has no button to a window the visitor may not see', async ({ page }) => {
    await page.goto('/services', { waitUntil: 'networkidle' })

    await expect(win(page, 'Services')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Archive' })).toHaveCount(0)
  })
})

test.describe('Window properties on a tablet', () => {
  test.use({ viewport: { width: 834, height: 1194 }, hasTouch: true })

  test('opens a window beside the apps, at the room there at most', async ({ page }) => {
    await emptyDesk(page)
    await page.goto('/welcome', { waitUntil: 'networkidle' })
    const apps = (await page.locator('.apps').boundingBox())!
    const welcome = win(page, 'Welcome')

    await expect.poll(async () => (await welcome.boundingBox())?.width).toBe(698)
    expect((await welcome.boundingBox())!.x).toBe(apps.x + apps.width)
  })
})

test.describe('Window properties on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('sets the buttons at the foot of the drawer, side by side', async ({ page }) => {
    await page.goto('/cv', { waitUntil: 'networkidle' })
    const cv = win(page, 'CV')
    const [download, write] = await Promise.all(
      ['Download', 'Write'].map(
        async (name) => (await foot(page, 'CV').getByRole('link', { name }).boundingBox())!,
      ),
    )
    const frame = (await cv.locator('.window__frame').boundingBox())!

    expect(download.y).toBe(write.y)
    expect(frame.y + frame.height - download.y - download.height).toBe(24)
  })
})
