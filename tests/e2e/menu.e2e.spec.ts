import type { Page } from '@playwright/test'

import { expect, test } from './test'

const top = (page: Page, name: string) =>
  page.getByRole('menubar').getByRole('menuitem', { name, exact: true })
const menu = (page: Page, name: string) => page.getByRole('menu', { name, exact: true })
const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
// What has the focus: its title, and the key it shows.
const focused = (page: Page) =>
  page.evaluate(() => {
    const at = document.activeElement as HTMLElement
    const shown = (part: string) => (at.querySelector(part) as HTMLElement | null)?.innerText ?? ''
    return { title: shown('.row__title') || at.innerText, key: shown('.row__meta') }
  })

// The key each command shows, on a device that is not Apple's.
const keys: Record<string, string> = {
  'Preferences…': ',',
  Hotkeys: '?',
  Search: 'Ctrl K',
  'Close window': 'Esc',
  'Full screen': 'F',
  Minimise: 'M',
  'Next window': 'N',
}

// When each child of a menu starts to arrive, in ms, and what it plays.
const turns = (page: Page, name: string) =>
  menu(page, name).evaluate((list) =>
    [...list.children].map((row) => {
      const { animationDelay, animationName } = getComputedStyle(row)
      return [Math.round(parseFloat(animationDelay) * 1000), animationName] as const
    }),
  )

// Choose a row with the pointer: a menu of the menu bar, then a row of it or of one of its submenus.
async function pick(page: Page, [first, ...rows]: string[]) {
  await top(page, first).click()
  let within = first
  for (const row of rows) {
    await menu(page, within).getByText(row, { exact: true }).first().click()
    within = row
  }
}

test.describe('Menus on a desk', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
  })

  test('every menu opens and is walked with keys alone, and each row shows its key', async ({
    page,
  }) => {
    // The menu bar is one stop of the keyboard, after the link that skips to the window.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    for (const name of ['Dimm OS', 'File', 'View', 'Window', 'Help', 'Legal']) {
      await expect(top(page, name)).toBeFocused()
      await page.keyboard.press('ArrowDown')
      const count = await menu(page, name).evaluate(
        (list) =>
          list.querySelectorAll(
            ':scope > [role^=menuitem]:not(:disabled), :scope > * > [role^=menuitem]:not(:disabled)',
          ).length,
      )
      expect(count).toBeGreaterThan(0)
      const seen = []
      for (let at = 0; at < count; at++) {
        seen.push(await focused(page))
        await page.keyboard.press('ArrowDown')
      }
      // The arrows go round, and every row with a key shows it.
      expect(await focused(page)).toEqual(seen[0])
      for (const { title, key } of seen) expect(key).toBe(keys[title] ?? '')
      // Esc closes the menu and gives the focus back to its button; Right goes to the next.
      await page.keyboard.press('Escape')
      await expect(menu(page, name)).toHaveCount(0)
      await expect(top(page, name)).toBeFocused()
      await page.keyboard.press('ArrowRight')
    }
    await expect(top(page, 'Dimm OS')).toBeFocused()
  })

  test('Right and Left go to the menu beside, Right opens a submenu, and Tab stays in the menu', async ({
    page,
  }) => {
    await top(page, 'View').focus()
    await page.keyboard.press('ArrowUp')
    expect((await focused(page)).title).toBe('Next wallpaper')
    await page.keyboard.press('ArrowUp')
    expect((await focused(page)).title).toBe('Dot')
    await page.keyboard.press('ArrowRight')
    await expect(menu(page, 'Dot')).toBeVisible()
    expect((await focused(page)).title).toBe('5')
    await page.keyboard.press('ArrowLeft')
    await expect(menu(page, 'Dot')).toHaveCount(0)
    expect((await focused(page)).title).toBe('Dot')
    await page.keyboard.press('Tab')
    expect((await focused(page)).title).toBe('Next wallpaper')
    await page.keyboard.press('Tab')
    expect((await focused(page)).title).toBe('Full screen')
    await page.keyboard.press('ArrowLeft')
    await expect(menu(page, 'File')).toBeVisible()
    await expect(menu(page, 'View')).toHaveCount(0)
    expect((await focused(page)).title).toBe('Search')
    // A press outside closes it.
    await page.mouse.click(700, 500)
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('each command acts', async ({ page }) => {
    const work = win(page, 'Work')
    const root = page.locator('html')
    await pick(page, ['Legal', 'Imprint'])
    await expect(win(page, 'Imprint')).toHaveAttribute('data-front', '')

    await pick(page, ['Window', 'Next window'])
    await expect(work).toHaveAttribute('data-front', '')
    await pick(page, ['Window', 'Move & Resize', 'Left half'])
    const desk = (await page.locator('.screen__desk').boundingBox())!
    await expect.poll(async () => (await work.boundingBox())!.x).toBe(desk.x)
    await pick(page, ['View', 'Full screen'])
    await expect(work).toHaveAttribute('data-full', '')
    await pick(page, ['View', 'Full screen'])
    await expect(work).not.toHaveAttribute('data-full', '')

    await pick(page, ['View', 'Theme', 'Light'])
    await expect(root).toHaveAttribute('data-theme', 'light')
    await pick(page, ['View', 'Dot', '12'])
    await expect(root).toHaveAttribute('data-pitch', '12')

    await pick(page, ['Window', 'Minimise'])
    await expect(work).toBeHidden()
    await pick(page, ['Window', 'work'])
    await expect(work).toHaveAttribute('data-front', '')
    await pick(page, ['File', 'Close window'])
    await expect(work).toHaveCount(0)

    await pick(page, ['Dimm OS', 'Preferences…'])
    await expect(win(page, 'Preferences')).toHaveAttribute('data-front', '')
    await top(page, 'Help').click()
    for (const [name, path] of [
      ['Hotkeys', '/hotkeys'],
      ['Accessibility', '/accessibility'],
    ]) {
      await expect(menu(page, 'Help').getByRole('menuitem', { name })).toHaveAttribute('href', path)
    }
    await expect(menu(page, 'Help').getByRole('menuitem')).toHaveCount(2)
    await expect(menu(page, 'Help').getByRole('menuitem', { name: 'Hotkeys' })).toContainText('?')
    // No row stands in two menus, in either language.
    for (const language of ['', '/de']) {
      await page.goto(`${language}/work`, { waitUntil: 'networkidle' })
      const rows: string[] = []
      for (const name of await page.getByRole('menubar').getByRole('menuitem').allInnerTexts()) {
        await top(page, name).click()
        rows.push(...(await menu(page, name).getByRole('menuitem').allInnerTexts()))
        await page.keyboard.press('Escape')
      }
      expect(rows.length).toBe(new Set(rows).size)
    }
    await top(page, 'Dimm OS').click()
    await expect(menu(page, 'Dimm OS').getByRole('menuitem')).toHaveCount(4)
    await expect(menu(page, 'Dimm OS').getByRole('separator')).toHaveCount(1)
  })

  test('Legal, after Help, holds the legal windows and consent, each a link, and no bottom bar does', async ({
    page,
  }) => {
    await expect(page.getByRole('menubar').getByRole('menuitem').last()).toHaveText('Legal')
    await expect(page.locator('footer[data-for="desk"]').getByRole('link')).toHaveText([
      'Preferences',
    ])
    await top(page, 'Legal').click()
    const rows = menu(page, 'Legal').getByRole('menuitem')
    await expect(rows).toHaveText(['Imprint', 'Privacy', 'Cookies', 'Cookie preferences…'])
    for (const [at, path] of [
      '/imprint',
      '/privacy-policy',
      '/cookies',
      '/cookies/preferences',
    ].entries())
      await expect(rows.nth(at)).toHaveAttribute('href', path)
    await expect(menu(page, 'Legal').getByRole('separator')).toHaveCount(1)
    await rows.first().click()
    await expect(win(page, 'Imprint')).toHaveAttribute('data-front', '')
  })

  test('a menu grows out of the corner under its button within fast, and fades with reduced motion', async ({
    page,
  }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion: motion })
      await page.reload({ waitUntil: 'networkidle' })
      await page.evaluate(() => {
        const seen: [number, number, number][] = []
        Object.assign(window, { seen })
        const start = performance.now()
        requestAnimationFrame(function look() {
          const part = document.querySelector('.menu__hang')
          if (part) {
            const { a, d } = new DOMMatrix(getComputedStyle(part).transform)
            if (a !== d) throw new Error('a menu grows alike both ways')
            seen.push([performance.now() - start, d, +getComputedStyle(part).opacity])
          }
          requestAnimationFrame(look)
        })
      })
      await top(page, 'File').click()
      await expect(menu(page, 'File')).toBeVisible()
      await page.waitForTimeout(400)
      const seen = (await page.evaluate(() => Reflect.get(window, 'seen'))) as number[][]
      const first = seen[0]
      const arrived = seen.find(([, scale, opacity]) => scale === 1 && opacity === 1)!
      expect(arrived[0] - first[0]).toBeLessThanOrEqual((motion === 'reduce' ? 80 : 160) + 34)
      if (motion === 'reduce') expect(seen.every(([, scale]) => scale === 1)).toBe(true)
      else expect(first[1]).toBeGreaterThanOrEqual(0.96)
      expect(
        await page
          .locator('.menu__hang')
          .evaluate((part) => getComputedStyle(part).transformOrigin),
      ).toBe('0px 0px')
    }
  })

  test('its rows arrive in turn; moved on to, a menu only fades in, its rows without the first wait', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.reload({ waitUntil: 'networkidle' })
    await top(page, 'File').click()
    // A row can be pressed as soon as it can be seen: held early in its turn, it is where the pointer finds it.
    const row = menu(page, 'File').getByRole('menuitem').first()
    await row.evaluate(async (one) => {
      await new Promise(requestAnimationFrame)
      for (const move of one.getAnimations()) move.pause()
    })
    expect(
      await row.evaluate((one) => {
        const { x, y, width, height } = one.getBoundingClientRect()
        const seen = +getComputedStyle(one).opacity
        const hit = document
          .elementFromPoint(x + width / 2, y + height / 2)
          ?.closest('[role=menuitem]')
        return seen < 1 && hit === one
      }),
    ).toBe(true)
    await row.evaluate((one) => one.getAnimations().forEach((move) => move.play()))
    // Its six children, the rule among them, each a turn after the one before.
    expect(await turns(page, 'File')).toEqual(
      [40, 70, 100, 130, 160, 190].map((delay) => [delay, 'turn']),
    )
    // The menu it moved on from is gone as the next arrives.
    await top(page, 'View').hover()
    await expect(menu(page, 'View')).toHaveCount(1)
    expect(await page.getByRole('menu').count()).toBe(1)
    expect(
      await menu(page, 'View').evaluate(
        (list) => new DOMMatrix(getComputedStyle(list.parentElement!).transform).a,
      ),
    ).toBe(1)
    expect((await turns(page, 'View')).slice(0, 2).map(([delay]) => delay)).toEqual([0, 30])

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload({ waitUntil: 'networkidle' })
    await top(page, 'File').click()
    expect((await turns(page, 'File')).every(([, name]) => name === 'none')).toBe(true)
  })
})

test.describe('The theme and the language', () => {
  const bar = (page: Page, name: string) =>
    page.locator('header').getByRole('button', { name, exact: true })
  // Each choice, and whether its mark is filled.
  const choices = (page: Page, name: string) =>
    menu(page, name)
      .getByRole('menuitemradio')
      .evaluateAll((rows) =>
        rows.map((row) => [
          (row as HTMLElement).innerText,
          row.getAttribute('aria-checked'),
          row.querySelector('.mark')?.getAttribute('data-tone') ?? 'filled',
        ]),
      )

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/work', { waitUntil: 'networkidle' })
  })

  test('the theme button opens three choices, changes nothing until one is chosen, and System hands back to the device', async ({
    page,
  }) => {
    const root = page.locator('html')
    const button = bar(page, 'Theme')
    await expect(button).toHaveAttribute('aria-haspopup', 'menu')
    await button.click()
    expect(await choices(page, 'Theme')).toEqual([
      ['System', 'true', 'filled'],
      ['Dark', 'false', 'off'],
      ['Light', 'false', 'off'],
    ])
    await page.keyboard.press('Escape')
    await expect(menu(page, 'Theme')).toHaveCount(0)
    await expect(button).toBeFocused()
    await expect(root).toHaveAttribute('data-theme', 'dark')

    // With keys alone: open, move to Light, choose it.
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(menu(page, 'Theme')).toHaveCount(0)
    await expect(root).toHaveAttribute('data-theme', 'light')
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light')

    await pick(page, ['View', 'Theme'])
    expect((await choices(page, 'Theme')).map(([, checked]) => checked)).toEqual([
      'false',
      'false',
      'true',
    ])
    await menu(page, 'Theme').getByRole('menuitemradio', { name: 'System' }).click()
    await expect(root).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull()
  })

  test('the language button opens the languages by their own names, and the other shows the same window', async ({
    page,
  }) => {
    const button = bar(page, 'Language: English')
    await expect(button).toHaveAttribute('aria-haspopup', 'menu')
    await button.click()
    expect(await choices(page, 'Language')).toEqual([
      ['English', 'true', 'filled'],
      ['Deutsch', 'false', 'off'],
    ])
    await menu(page, 'Language').getByRole('menuitemradio', { name: 'English' }).click()
    await expect(menu(page, 'Language')).toHaveCount(0)
    await expect(page).toHaveURL(/\/work$/)

    await button.click()
    const german = menu(page, 'Language').getByRole('menuitemradio', { name: 'Deutsch' })
    await expect(german).toHaveAttribute('href', '/de/work')
    await expect(german).toHaveAttribute('hreflang', 'de')
    await german.click()
    await expect(page).toHaveURL(/\/de\/work$/)
    await expect(bar(page, 'Sprache: Deutsch')).toBeVisible()
  })

  test('the login screen keeps its language button, which opens the same menu', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page
      .locator('[data-waiting] header')
      .getByRole('button', { name: 'Language: English', exact: true })
      .click()
    await expect(
      menu(page, 'Language').getByRole('menuitemradio', { name: 'Deutsch' }),
    ).toHaveAttribute('href', '/de')
  })
})

test.describe('Menus on a tablet', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 1194, height: 834 } })

  test('the one menu ends with Legal, its rows in the same order', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await top(page, 'Menu').click()
    await expect(menu(page, 'Menu').getByRole('menuitem')).toHaveText([
      'File',
      'View',
      'Window',
      'Help',
      'Legal',
    ])
    await menu(page, 'Menu').getByRole('menuitem', { name: 'Legal' }).click()
    await expect(menu(page, 'Legal').getByRole('menuitem')).toHaveText([
      'Imprint',
      'Privacy',
      'Cookies',
      'Cookie preferences…',
    ])
  })
})

test.describe('The Dimm OS screen on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const screen = (page: Page, name = 'Dimm OS') => page.getByRole('dialog', { name })

  for (const [language, names] of [
    ['', ['Dimm OS', 'Imprint', 'Privacy', 'Cookies', 'Cookie preferences']],
    ['/de', ['Dimm OS', 'Impressum', 'Datenschutz', 'Cookies', 'Cookie-Einstellungen']],
  ] as const) {
    test(`is a modal drawer of groups, and opens the legal windows as drawers${language && ', in German'}`, async ({
      page,
    }) => {
      const [system, ...legal] = names
      for (const name of legal) {
        await page.goto(`${language}/work`, { waitUntil: 'networkidle' })
        await top(page, system).click()
        await expect(screen(page, system)).toHaveJSProperty('open', true)
        expect(await screen(page, system).evaluate((dialog) => dialog.matches(':modal'))).toBe(true)
        await expect(page.locator('article.window[data-back="1"]')).toHaveCount(1)
        await screen(page, system).getByRole('link', { name, exact: true }).click()
        await expect(page.locator('dialog')).toHaveCount(0)
        await expect(win(page, name)).toHaveAttribute('data-front', '')
      }
    })
  }

  test('reads in the order drawn, each group under its heading, every row 48 high or more', async ({
    page,
  }) => {
    await page.goto('/work', { waitUntil: 'networkidle' })
    await top(page, 'Dimm OS').click()
    const body = screen(page).locator('.dialog__body')
    await expect(body.getByRole('heading')).toHaveText(['Appearance', 'System', 'Legal'])
    const rows = body.locator('.row:not(.list__head)')
    await expect(rows.locator('.row__title')).toHaveText([
      'Guest',
      'Theme',
      'Language',
      'About Dimm OS',
      'Preferences',
      'Accessibility',
      'Gestures',
      'Imprint',
      'Privacy',
      'Cookies',
      'Cookie preferences',
      'Lock screen',
      'Shut down',
    ])
    await expect(rows.first()).toContainText('Log in')
    for (const height of await rows.evaluateAll((all) =>
      all.map((row) => row.getBoundingClientRect().height),
    ))
      expect(height).toBeGreaterThanOrEqual(48)
    // Theme and Language lead to no window, so they end with no arrow; the rows of the windows do.
    await expect(rows.nth(1).locator('.row__trail')).toHaveCount(0)
    await expect(rows.nth(2).locator('.row__trail')).toHaveCount(0)
    await expect(rows.nth(3).locator('.row__trail .icon')).toHaveCount(1)
    // The focus starts on the first row and the handle puts the drawer away, the focus back on its button.
    await expect(rows.first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(top(page, 'Dimm OS')).toBeFocused()
  })

  test('Theme and Language show the choice in force and open their choices as a drawer in front', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/work', { waitUntil: 'networkidle' })
    await top(page, 'Dimm OS').click()
    const theme = screen(page).getByRole('button', { name: /^Theme/ })
    await expect(theme.locator('.row__meta')).toHaveText('System')
    await expect(
      screen(page)
        .getByRole('button', { name: /^Language/ })
        .locator('.row__meta'),
    ).toHaveText('English')
    await theme.click()
    await expect(screen(page, 'Theme')).toBeVisible()
    await expect(theme).toHaveAttribute('aria-expanded', 'true')
    // Esc puts the choices away first, the focus back on their row.
    await page.keyboard.press('Escape')
    await expect(menu(page, 'Theme')).toHaveCount(0)
    await expect(theme).toBeFocused()
    await theme.click()
    await menu(page, 'Theme').getByRole('menuitemradio', { name: 'Light' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('dialog')).toHaveCount(0)
    await top(page, 'Dimm OS').click()
    await expect(theme.locator('.row__meta')).toHaveText('Light')
  })

  test('at 360 wide no row wraps, and the body scrolls under its title where the screen is shorter', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/work', { waitUntil: 'networkidle' })
    await top(page, 'Dimm OS').click()
    const body = screen(page).locator('.dialog__body')
    for (const height of await body
      .locator('.row:not(.list__head) .row__title')
      .evaluateAll((all) => all.map((title) => title.getBoundingClientRect().height)))
      expect(height).toBeCloseTo(24, 0)
    expect(await body.evaluate((part) => part.scrollHeight > part.clientHeight)).toBe(true)
    await body.getByRole('button', { name: 'Shut down' }).scrollIntoViewIfNeeded()
    await expect(screen(page).locator('.bar')).toBeInViewport()
  })
})

test.describe('Dialog', () => {
  test('is modal: the focus moves in and stays in, Esc closes it and the focus returns', async ({
    page,
  }) => {
    await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
    const opener = page.getByRole('button', { name: 'Open the dialog' })
    await page.evaluate(() => {
      const seen: number[] = []
      Object.assign(window, { seen })
      requestAnimationFrame(function look() {
        const frame = document.querySelector('dialog:modal .dialog__frame')
        if (frame) seen.push(new DOMMatrix(getComputedStyle(frame).transform).a)
        requestAnimationFrame(look)
      })
    })
    await opener.click()
    const dialog = page.locator('dialog:modal')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
    // It comes from 96 % at its own place.
    await page.waitForTimeout(300)
    const seen = (await page.evaluate(() => Reflect.get(window, 'seen'))) as number[]
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0.96)
    expect(seen.at(-1)).toBe(1)
    // What lies behind cannot be reached: Tab goes round the dialog.
    for (let press = 0; press < 4; press++) {
      await page.keyboard.press('Tab')
      expect(
        await page.evaluate(
          () =>
            !document.activeElement?.closest('body *') ||
            !!document.activeElement.closest('dialog:modal'),
        ),
      ).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test('the catalogue entries are drawn at the sizes of the system', async ({ page }) => {
    await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
    const size = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((part) => {
          const { width, height } = part.getBoundingClientRect()
          return [width, height]
        })
    expect(await size('.menu[data-surface] .row[data-size="compact"]')).toEqual([192, 32])
    expect((await size('.menu[data-surface] .row:not([data-size])'))[1]).toBe(48)
    expect((await size('.dialog:not([data-drawer]) .dialog__frame'))[0]).toBe(480)
    expect((await size('.notice'))[0]).toBe(320)
  })
})

test('the menus the catalogue draws open stay open when something else is pressed', async ({
  page,
}) => {
  await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
  const open = page.locator('[aria-haspopup=menu][aria-expanded=true]')
  const count = await open.count()
  expect(count).toBeGreaterThan(0)
  await page.mouse.click(5, 300)
  await expect(open).toHaveCount(count)
})
