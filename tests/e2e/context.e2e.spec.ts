import type { Page } from '@playwright/test'

import { expect, test } from './test'

const menu = (page: Page) => page.locator('.menu__point [role=menu]')
const rows = (page: Page) =>
  menu(page).evaluate((one) =>
    [...one.children].map((row) => (row.matches('[role=separator]') ? '-' : row.textContent)),
  )
// Whether the page took the right click for itself, or left it to the browser.
const taken = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((done) =>
        document.addEventListener('contextmenu', (event) => done(event.defaultPrevented), {
          once: true,
        }),
      ),
  )

test.describe('right-click menus on a desk', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test('each place opens the menu about the thing under the pointer, which is held', async ({
    page,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    const work = page.locator('.apps > a.app', { hasText: 'Work' })
    const places: [ReturnType<Page['locator']>, (string | null)[], object?][] = [
      [
        page.locator('main.screen__desk'),
        ['Next wallpaper', 'Preferences…', '-', 'Minimise all windows', 'Close all windows'],
        { position: { x: 200, y: 700 } },
      ],
      [work, ['Open', '-', 'Copy link']],
      [page.locator('.apps > a.app', { hasText: 'CV' }), ['Open', 'Download', '-', 'Copy link']],
      [
        page.locator('.window__bar'),
        ['Minimise', 'Full screen', 'Move & Resize', '-', 'Copy link', '-', 'Close'],
      ],
      [page.locator('[id^="task-window"]'), ['Minimise', 'Full screen', '-', 'Close']],
      [page.locator('.bar__text:has(> time)'), ['Somewhere', 'Yours']],
    ]
    for (const [place, expected, options] of places) {
      await place.click({ button: 'right', ...options })
      await expect.poll(() => rows(page)).toEqual(expected)
      await page.keyboard.press('Escape')
      await expect(menu(page)).toHaveCount(0)
    }

    await work.click({ button: 'right' })
    await expect(work).toHaveAttribute('data-held', '')
    await page.mouse.click(1000, 800)
    await expect(menu(page)).toHaveCount(0)
    await expect(work).not.toHaveAttribute('data-held')
  })

  test('its rows run the commands: the taskbar shows a window put away, an item opens', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await page.locator('[id^="task-window"]').click({ button: 'right' })
    await menu(page).getByRole('menuitem', { name: 'Minimise' }).click()
    await expect(page.locator('article.window:visible')).toHaveCount(0)
    await page.locator('[id^="task-window"]').click({ button: 'right' })
    await expect.poll(() => rows(page)).toEqual(['Show', 'Full screen', '-', 'Close'])
    await menu(page).getByRole('menuitem', { name: 'Show' }).click()
    await expect(page.locator('article.window:visible')).toHaveCount(1)

    await page.goto('/field', { waitUntil: 'networkidle' })
    const item = page.locator('article.window a.row[href="/work/grow"]').first()
    await item.click({ button: 'right' })
    await expect.poll(() => rows(page)).toEqual(['Open', 'Open in new tab', '-', 'Copy link'])
    await menu(page).getByRole('menuitem', { name: 'Copy link' }).click()
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${baseURL}/work/grow`)
    await item.click({ button: 'right' })
    await menu(page).getByRole('menuitem', { name: 'Open', exact: true }).click()
    await expect(page).toHaveURL('/work/grow')
  })

  test('text, a link in text and a field keep the menu of the browser', async ({ page }) => {
    await page.goto('/field', { waitUntil: 'networkidle' })
    for (const target of [
      page.locator('article.window .window__body p:not(a *)').first(),
      page.locator('article.window a.link').first(),
    ]) {
      const left = taken(page)
      await target.click({ button: 'right' })
      expect(await left).toBe(false)
      await expect(menu(page)).toHaveCount(0)
    }
    await page.goto('/contact', { waitUntil: 'networkidle' })
    const left = taken(page)
    await page.locator('article.window textarea, article.window input').first().click({
      button: 'right',
    })
    expect(await left).toBe(false)
    await expect(menu(page)).toHaveCount(0)
  })

  test('the keyboard opens the same menu at what has the focus, and Escape gives it back', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = page.locator('.apps > a.app', { hasText: 'Work' })
    await work.focus()
    await page.keyboard.press('Shift+F10')
    await expect.poll(() => rows(page)).toEqual(['Open', '-', 'Copy link'])
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${baseURL}/work`)
    await expect(menu(page)).toHaveCount(0)
    await page.keyboard.press('Shift+F10')
    await expect(menu(page)).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(menu(page)).toHaveCount(0)
    await expect(work).toBeFocused()
  })

  test('opened at the last pixel of the screen it stays whole on the screen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.mouse.click(1439, 851, { button: 'right' })
    await expect(menu(page)).toHaveCount(1)
    await page.waitForTimeout(400)
    const box = (await menu(page).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(1440)
    expect(box.y + box.height).toBeLessThanOrEqual(900)
  })
})

test.describe('right-click menus on a touch desk', () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

  test('a finger that drags a title bar is no long press', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    const at = (await page.locator('.window__bar .path').boundingBox())!
    const finger = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', dx: number) =>
      finger.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: at.x + 10 + dx, y: at.y + 5 }],
      })
    await touch('touchStart', 0)
    for (let step = 1; step <= 16; step++) {
      await touch('touchMove', step * 8)
      await page.waitForTimeout(50)
    }
    await expect(menu(page)).toHaveCount(0)
    await touch('touchEnd', 0)
  })
})

test.describe('right-click menus on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('a long press on an app opens the same rows as a drawer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const work = page.locator('.apps > a.app', { hasText: 'Work' })
    await work.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
    const drawer = page.locator('dialog[data-drawer][open]', { has: page.getByRole('menu') })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('menuitem')).toHaveText(['Open', 'Copy link'])
    await work.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true })
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
  })
})
