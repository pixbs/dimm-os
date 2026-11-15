import type { Page } from '@playwright/test'

import { expect, test } from './test'

const windows = (page: Page) => page.locator('article h1')
const front = (page: Page) => page.locator('article[data-front] h1')
const closeFront = (page: Page) =>
  page.locator('article[data-front]').getByRole('button', { name: 'Close' }).click()

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
    await page.goto('/')
    await mark(page)

    await page.getByRole('link', { name: 'Work' }).click()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await page.getByRole('link', { name: 'Grow' }).click()
    await expect(page).toHaveURL('/work/grow')
    await expect(front(page)).toHaveText('Grow')
    await expect(windows(page)).toHaveText(['Work', 'Grow'])

    await page.getByRole('heading', { name: 'Work' }).click()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await page.goBack()
    await expect(page).toHaveURL('/work/grow')
    await expect(front(page)).toHaveText('Grow')

    await page.goBack()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await page.goForward()
    await expect(page).toHaveURL('/work/grow')
    await expect(front(page)).toHaveText('Grow')
    await expect(windows(page)).toHaveText(['Work', 'Grow'])
    expect(await marked(page)).toBe(true)

    await page.reload()
    await expect(page).toHaveURL('/work/grow')
    await expect(front(page)).toHaveText('Grow')
    await expect(windows(page)).toHaveText(['Grow', 'Work'])

    await closeFront(page)
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')

    await closeFront(page)
    await expect(page).toHaveURL('/')
    await expect(windows(page)).toHaveCount(0)

    await page.goBack()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')
  })

  test('opens a window of the German desk at its German address', async ({ page }) => {
    await page.goto('/de')
    await mark(page)

    await page.getByRole('link', { name: 'Arbeit' }).click()
    await expect(page).toHaveURL('/de/work')
    await expect(front(page)).toHaveText('Arbeit')
    expect(await marked(page)).toBe(true)
  })

  test('leaves a link to the browser when its view cannot be fetched', async ({ page }) => {
    await page.route('**/view/**', (route) => route.fulfill({ body: 'not a view' }))
    await page.goto('/')
    await mark(page)

    await page.getByRole('link', { name: 'Work' }).click()
    await expect(page).toHaveURL('/work')
    await expect(front(page)).toHaveText('Work')
    expect(await marked(page)).toBe(false)
  })

  test('sends the holder of the visitor cookie to an uncached page and view', async ({
    baseURL,
    context,
    page,
  }) => {
    expect((await page.request.get('/work/vault')).status()).toBe(404)
    expect((await page.request.get('/view/en/work/vault')).status()).toBe(404)

    await context.addCookies([{ name: 'visitor', value: '1', url: baseURL }])

    const response = await page.goto('/work/vault')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control']).toContain('no-store')
    await expect(front(page)).toHaveText('Vault')

    const view = await page.request.get('/view/en/work/vault')
    expect(view.status()).toBe(200)
    expect(view.headers()['cache-control']).toContain('no-store')
  })

  test('keeps the script sent for / under 300 KiB', async ({ page }) => {
    test.skip(!process.env.CI, 'The budget holds for the production build, which CI serves.')

    const sizes: Promise<number>[] = []
    page.on('response', (response) => {
      const request = response.request()
      if (request.resourceType() === 'script') {
        sizes.push(request.sizes().then((size) => size.responseBodySize))
      }
    })
    await page.goto('/', { waitUntil: 'networkidle' })

    const sent = (await Promise.all(sizes)).reduce((sum, size) => sum + size, 0)
    expect(sent).toBeGreaterThan(0)
    expect(sent).toBeLessThan(300 * 1024)
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
