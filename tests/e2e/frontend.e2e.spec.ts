import type { Page } from '@playwright/test'

import { login } from './login'
import { emptyDesk, expect, test } from './test'

const windows = (page: Page) => page.locator('article h1')
const front = (page: Page) => page.locator('article[data-front] h1')
const closeFront = (page: Page) =>
  page.locator('article[data-front]').getByRole('button', { name: 'Close' }).click()
// The shortcuts on the desk, apart from the links inside the windows.
const app = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Apps' }).getByRole('link', { name })

// A mark on the document tells a page load from a window the desk opened: only a load removes it.
const mark = (page: Page) => page.evaluate(() => void Object.assign(window, { marked: true }))
const marked = (page: Page) => page.evaluate(() => 'marked' in window)

test.describe('Frontend', () => {
  test('can go on homepage', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle('Dimm OS')
  })

  test('opens windows without a page load, and back, forward and reload keep them and the address', async ({
    page,
  }) => {
    // What the Next.js router fetches: it serves the first load and nothing after it.
    const routed: string[] = []
    page.on('request', (request) => {
      if (request.headers().rsc) routed.push(request.url())
    })
    await emptyDesk(page)
    await page.goto('/')
    await mark(page)

    await app(page, 'Work').click()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await app(page, 'Services').click()
    await expect(page).toHaveURL('/services')
    await expect(front(page)).toHaveText('Services')
    await expect(windows(page)).toHaveText(['Work', 'Services'])

    // The window behind shows a strip of its bar beside the one in front: a press there picks it.
    await page
      .locator('article:not([data-front]) .window__bar')
      .click({ position: { x: 16, y: 16 } })
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await page.goBack()
    await expect(page).toHaveURL('/services')
    await expect(front(page)).toHaveText('Services')

    await page.goBack()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await page.goForward()
    await expect(page).toHaveURL('/services')
    await expect(front(page)).toHaveText('Services')
    await expect(windows(page)).toHaveText(['Work', 'Services'])
    expect(await marked(page)).toBe(true)

    await page.reload()
    await expect(page).toHaveURL('/services')
    await expect(front(page)).toHaveText('Services')
    await expect(windows(page)).toHaveText(['Services', 'Work'])

    // Back now reaches the entries written before the reload, and the desk stays as it stands.
    await page.goBack()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')
    await expect(windows(page)).toHaveText(['Services', 'Work'])

    await page.goBack()
    await expect(page).toHaveURL('/')
    await expect(windows(page)).toHaveText(['Services', 'Work'])

    await page.goForward()
    await expect(page).toHaveURL('/work')
    await closeFront(page)
    await expect(page).toHaveURL('/services')
    await expect(front(page)).toHaveText('Services')

    await closeFront(page)
    await expect(page).toHaveURL('/')
    await expect(windows(page)).toHaveCount(0)

    await page.goForward()
    await expect(page).toHaveURL('/services')
    await expect(front(page)).toHaveText('Services')
    expect(routed).toEqual([])
  })

  test("opens an item in its parent's window, with the way back, its place and the items beside it", async ({
    page,
  }) => {
    await page.goto('/work')
    await mark(page)
    const work = page.locator('#window-work')
    // A window with items counts them in its toolbar.
    await expect(work.locator('.window__content > .bar').nth(1).getByRole('status')).toHaveText(
      '3 case studies',
    )

    await work.getByRole('link', { name: 'Grow' }).click()
    await expect(page).toHaveURL('/work/grow')
    await expect(windows(page)).toHaveText(['Grow'])
    await expect(work.getByRole('heading', { name: 'Grow' })).toBeFocused()
    // The bar says the path, and the file type, which the path never holds.
    await expect(work.locator('.window__bar .path')).toHaveText('work/grow.case')
    const line = work.locator('.window__content > .bar').nth(1)
    await expect(line.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work')
    await expect(line.locator('.bar__text').last()).toHaveText('01 / 03')
    // The first item leads back to its window, and on to the item after it.
    const pager = work.getByRole('navigation')
    await expect(pager.getByRole('link')).toHaveText(['Work', 'Field'])
    await expect(pager.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work')

    await pager.getByRole('link', { name: 'Field' }).click()
    await expect(page).toHaveURL('/work/field')
    await expect(pager.getByRole('link')).toHaveText(['Grow', 'Loop'])
    await expect(line.locator('.bar__text').last()).toHaveText('02 / 03')
    // The view it replaces leaves as the new one comes.
    await page.goBack()
    await expect(page).toHaveURL('/work/grow')
    await expect(windows(page)).toHaveText(['Grow'])

    await line.getByRole('link', { name: 'Work', exact: true }).click()
    await expect(page).toHaveURL('/work')
    await expect(windows(page)).toHaveText(['Work'])
    await expect(page.locator('footer[data-for="desk"] button')).toHaveText(['work'])
    expect(await marked(page)).toBe(true)
  })

  test('opens the windows marked to open at start on a desk, and the first alone on a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.locator('article')).toHaveCount(2)
    await expect(front(page)).toHaveText('Welcome')
    await expect(page).toHaveURL('/')

    // A tab that has shown the desk keeps its windows, so these open once.
    await closeFront(page)
    await expect(page).toHaveURL('/work')
    await page.goto('/')
    await expect(windows(page)).toHaveText(['Work'])

    const phone = await page.context().newPage()
    await phone.setViewportSize({ width: 390, height: 844 })
    await phone.goto('/')
    await expect(phone.locator('article[data-front] h1')).toHaveText('Welcome')
    await expect(phone.locator('article')).toHaveCount(1)
    await expect(phone).toHaveURL('/')
    // It opened without the visitor, so it waits for them as the page's own window does.
    await phone.waitForTimeout(500)
    expect(await phone.evaluate(() => document.activeElement === document.body)).toBe(true)
  })

  test('closes a window behind by its control without touching the address or the history', async ({
    page,
  }) => {
    // The dots stand at the start of the bar, where a window behind shows it.
    await page.addInitScript(() => localStorage.setItem('hand', 'dots'))
    await emptyDesk(page)
    await page.goto('/')
    await app(page, 'Work').click()
    await app(page, 'Services').click()
    await expect(page).toHaveURL('/services')
    const entries = await page.evaluate(() => history.length)

    await page.locator('article:not([data-front])').getByRole('button', { name: 'Close' }).click()
    await expect(windows(page)).toHaveText(['Services'])
    await expect(page).toHaveURL('/services')
    expect(await page.evaluate(() => history.length)).toBe(entries)
  })

  test('opens a window of the German desk at its German address', async ({ page }) => {
    await emptyDesk(page)
    await page.goto('/de')
    await mark(page)

    await app(page, 'Arbeit').click()
    await expect(page).toHaveURL('/de/work')
    await expect(front(page)).toHaveText('Arbeit')
    expect(await marked(page)).toBe(true)
  })

  test('marks the English of a German page whose window is not written in German yet', async ({
    page,
  }) => {
    await page.goto('/de/work')
    const item = page.locator('#window-work .list__item').nth(2)
    await expect(item).toHaveAttribute('lang', 'en')
    await item.getByRole('button').first().click()
    await expect(item.getByRole('link', { name: 'Loop' })).toHaveAttribute('hreflang', 'en')

    await page.goto('/de/work/loop')
    const loop = page.locator('#window-work')
    await expect(loop.locator('[lang="en"] h1')).toHaveText('Loop')
    await expect(loop.locator('.window__content > .bar').last()).toHaveText(
      'Noch nicht auf Deutsch geschrieben: hier auf Englisch.',
    )
  })

  test('leaves a link to the browser when its view cannot be fetched', async ({ page }) => {
    await page.route('**/view/**', (route) => route.fulfill({ body: 'not a view' }))
    await emptyDesk(page)
    await page.goto('/')
    await mark(page)

    await app(page, 'Work').click()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')
    expect(await marked(page)).toBe(false)
  })

  test('sends the holder of the visitor cookie to an uncached page and view, where until the login it is a guest', async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([{ name: 'visitor', value: '1', url: baseURL }])

    const response = await page.goto('/work')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control']).toContain('no-store')
    await expect(front(page)).toHaveText('Work')

    const view = await page.request.get('/view/en/work')
    expect(view.status()).toBe(200)
    expect(view.headers()['cache-control']).toContain('no-store')
    expect((await page.request.get('/view/en/work/vault')).status()).toBe(404)
  })

  test('keeps the script sent for / under 300 KiB, most of Motion fetched after first paint', async ({
    page,
  }) => {
    test.skip(!process.env.CI, 'The budget holds for the production build, which CI serves.')

    const scripts: Promise<[string, number]>[] = []
    page.on('response', (response) => {
      const request = response.request()
      if (request.resourceType() === 'script') {
        const path = new URL(request.url()).pathname
        scripts.push(request.sizes().then((size) => [path, size.responseBodySize]))
      }
    })
    const html = await (await page.goto('/', { waitUntil: 'networkidle' }))!.text()

    const sent = await Promise.all(scripts)
    const size = (some: [string, number][]) => some.reduce((sum, [, size]) => sum + size, 0)
    expect(size(sent)).toBeGreaterThan(0)
    expect(size(sent)).toBeLessThan(300 * 1024)
    // The page names the script it starts with: the features of Motion are fetched once it runs.
    expect(size(sent.filter(([path]) => !html.includes(path)))).toBeGreaterThan(30 * 1024)
  })
})

test.describe('Frontend at an address without a window', () => {
  // The browser reports the 404 of the page itself as an error.
  test.use({ pageErrors: async ({}, run) => run() })

  test('answers 404 with the 404 window, for an address with nothing and for a hidden window', async ({
    page,
  }) => {
    for (const [path, title] of [
      ['/nothing', 'Not found'],
      ['/work/vault', 'Not found'],
      ['/de/work/nothing', 'Nicht gefunden'],
      ['/de/nothing.html', 'Nicht gefunden'],
      ['/en/a.b', 'Not found'],
    ]) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
      await expect(front(page)).toHaveText(title)
      // Its bar shows the address asked for, and its status line the error.
      const missing = page.locator('article[data-front]')
      await expect(missing.locator('.window__bar .path')).toHaveText(
        path.replace(/^\/de/, '').slice(1),
      )
      await expect(missing.locator('.window__content > .bar').last()).toHaveText(
        path.startsWith('/de') ? 'Fehler 404' : 'Error 404',
      )
      expect(
        (await page.request.get(`/view${path.startsWith('/de') ? '' : '/en'}${path}`)).status(),
      ).toBe(404)
    }
  })

  test('answers 404 with the 404 window of the system where the content holds none', async ({
    page,
  }) => {
    await login(page)
    const id = (
      await (await page.request.get('/api/windows?where[slug][equals]=404&depth=0')).json()
    ).docs[0].id
    const hide = (hidden: boolean) =>
      page.request.patch(`/api/windows/${id}?locale=en`, { data: { hidden } })
    try {
      await hide(true)
      for (const [path, title, alt] of [
        ['/does-not-exist', 'Not found', 'The numerals 404 in dots'],
        ['/de/gibt-es-nicht', 'Nicht gefunden', 'Die Ziffern 404 aus Punkten'],
      ]) {
        expect((await page.goto(path))?.status(), path).toBe(404)
        await expect(front(page)).toHaveText(title)
        const missing = page.locator('article[data-front]')
        await expect(missing.locator('.window__bar .path')).toHaveText(
          path.replace(/^\/de/, '').slice(1),
        )
        // The numerals in dots, over their still from the system rather than an upload.
        await expect(missing.locator('.media__live canvas')).toBeVisible()
        await expect(missing.locator('figure img')).toHaveAttribute('alt', alt)
        await expect(missing.locator('figure img')).toHaveAttribute('src', /numerals/)
      }
    } finally {
      await hide(false)
    }
  })

  test.describe('for a guest who is asked for consent', () => {
    test.use({ asked: true })

    for (const [device, viewport] of [
      ['phone', { width: 390, height: 844 }],
      ['tablet', { width: 834, height: 1194 }],
      ['desktop', { width: 1440, height: 900 }],
    ] as const)
      test(`shows the 404 window and never the page of Next.js, before script and after, on a ${device}`, async ({
        page,
        request,
      }) => {
        await page.setViewportSize(viewport)
        const theirs = 'This page could not be found'
        for (const [path, title, decline] of [
          ['/does-not-exist', 'Not found', 'Decline'],
          ['/de/gibt-es-nicht', 'Nicht gefunden', 'Ablehnen'],
          // No file and no window: an address with a dot outside a language, and a page the catalogue has not.
          ['/nothing.html', 'Not found', 'Decline'],
          ['/catalogue/nothing', 'Not found', 'Decline'],
          // What the platform keeps for its own page.
          ['/404', 'Not found', 'Decline'],
        ]) {
          // Before script: the answer is the desk with the window, in its language.
          const answer = await request.get(path)
          expect(answer.status(), path).toBe(404)
          const markup = await answer.text()
          expect(markup, path).toContain('data-front')
          expect(markup, path).toContain(`>${title}</h1>`)
          expect(markup, path).not.toContain(theirs)

          // After it, and once the window of consent in front has left: the same window at the same address.
          await page.evaluate(() => localStorage.clear()).catch(() => {})
          expect((await page.goto(path))?.status(), path).toBe(404)
          await page.getByRole('button', { name: decline }).click()
          await expect(front(page)).toHaveText(title)
          await expect(page).toHaveURL(path)
          await page.reload()
          await expect(front(page)).toHaveText(title)
          await expect(page.locator('article[data-front] .window__bar .path')).toHaveText(
            path.replace(/^\/de/, '').slice(1),
          )
          await expect(page.getByText(theirs)).toHaveCount(0)
        }
      })
  })

  test('leaves a real file with a dot to load as it is', async ({ request }) => {
    for (const path of ['/block-previews/cards.png', '/licenses/inter-tight.txt'])
      expect((await request.get(path)).status(), path).toBe(200)
  })

  test('answers 404 at the next request once a window is hidden', async ({ page, request }) => {
    await login(page)
    const windowId = (
      await (await page.request.get('/api/windows?where[slug][equals]=field&depth=0')).json()
    ).docs[0].id
    const hide = (hidden: boolean) =>
      page.request.patch(`/api/windows/${windowId}?locale=en`, { data: { hidden } })
    const status = async () => (await request.get('/work/field')).status()

    expect(await status()).toBe(200)
    try {
      await hide(true)
      expect(await status()).toBe(404)
    } finally {
      await hide(false)
    }
    expect(await status()).toBe(200)
  })

  test('redirects a window under an old parent to its path', async ({ page }) => {
    await page.goto('/services/grow')
    await expect(page).toHaveURL('/work/grow')
    await expect(front(page)).toHaveText('Grow')
  })

  test.describe('without script', () => {
    test.use({ javaScriptEnabled: false })

    test('returns the 404 window', async ({ page }) => {
      expect((await page.goto('/de/nothing'))?.status()).toBe(404)
      await expect(front(page)).toHaveText('Nicht gefunden')
    })
  })
})

test.describe('Frontend without script', () => {
  test.use({ javaScriptEnabled: false })

  test('returns the window of an address in each language', async ({ page }) => {
    await page.goto('/work/grow')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(front(page)).toHaveText('Grow')
    await expect(page.getByText('A fixture item that every guest may open.')).toBeVisible()

    await page.goto('/de/work/grow')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(front(page)).toHaveText('Grow')
    await expect(page.getByText('Ein Beispieleintrag, den jeder Gast öffnen darf.')).toBeVisible()
  })
})
