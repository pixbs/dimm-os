import type { Page } from '@playwright/test'

import { expect, test } from './test'

// The widths a picture may be made at, from next.config.ts.
const widths = [640, 960, 1280, 1920]

const entry = (page: Page, name: string) =>
  page.locator('.entry', { has: page.getByRole('heading', { name, exact: true }) })

// Every picture of dots the page draws, with when it was drawn and where its dots stand across.
const record = (page: Page) =>
  page.addInitScript(() => {
    const draws: { at: number; xs: number[] }[] = []
    Object.assign(window, { draws })
    const { clearRect, arc } = CanvasRenderingContext2D.prototype
    const ours = (context: CanvasRenderingContext2D) =>
      context.canvas.classList.contains('media__dots')
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (ours(this)) draws.push({ at: performance.now(), xs: [] })
      return clearRect.call(this, x, y, w, h)
    }
    CanvasRenderingContext2D.prototype.arc = function (x, y, ...rest) {
      if (ours(this)) draws.at(-1)!.xs.push(x)
      return arc.call(this, x, y, ...rest)
    }
  })

// The distance between two dots of each picture drawn in turn, and when each was first drawn.
const steps = (page: Page) =>
  page.evaluate(() =>
    (Reflect.get(window, 'draws') as { at: number; xs: number[] }[])
      .map(({ at, xs }) => {
        const across = [...new Set(xs.map(Math.round))].sort((a, b) => a - b)
        const step = Math.min(...across.slice(1).map((x, index) => x - across[index]))
        return { at, step }
      })
      .filter(({ step }, index, all) => step !== all[index - 1]?.step),
  )

// The picture that comes again as if it had just arrived.
const again = async (page: Page) => {
  const media = entry(page, 'Media')
  await media.getByRole('button', { name: 'Again' }).click()
  return media.locator('.played .media__picture')
}

test.describe('Content', () => {
  test('resolves a picture through dots at four, two and one times the pitch, 80 ms a step, then fades the photo in', async ({
    page,
  }) => {
    await record(page)
    await page.goto('/catalogue/content')
    const picture = await again(page)

    await expect(picture).toHaveAttribute('data-picture', 'shown')
    const drawn = await steps(page)
    expect(drawn.map(({ step }) => step)).toEqual([32, 16, 8])
    for (const index of [1, 2]) {
      expect(drawn[index].at - drawn[index - 1].at).toBeGreaterThanOrEqual(79)
      expect(drawn[index].at - drawn[index - 1].at).toBeLessThan(160)
    }
    await expect(picture.locator('img')).toHaveCSS('opacity', '1')
    await expect(picture.locator('canvas')).toHaveCSS('opacity', '0')
  })

  test('resolves on the pitch the visitor set', async ({ page }) => {
    await record(page)
    await page.addInitScript(() => localStorage.setItem('pitch', '12'))
    await page.goto('/catalogue/content')
    const picture = await again(page)

    await expect(picture).toHaveAttribute('data-picture', 'shown')
    expect((await steps(page)).map(({ step }) => step)).toEqual([48, 24, 12])
  })

  for (const setting of ['motion', 'pause'] as const) {
    test(`fades the photo straight in under ${setting === 'motion' ? 'reduced motion' : 'pause'}`, async ({
      page,
    }) => {
      await record(page)
      await page.addInitScript(
        (setting) => localStorage.setItem(setting, setting === 'motion' ? 'reduce' : 'on'),
        setting,
      )
      await page.goto('/catalogue/content')
      const picture = await again(page)

      await expect(picture).toHaveAttribute('data-picture', 'shown')
      await expect(picture.locator('img')).toHaveCSS('opacity', '1')
      expect(await steps(page)).toEqual([])
    })
  }

  test('shows the first picture on screen at once, neither lazy nor animated', async ({ page }) => {
    await page.goto('/catalogue/content')
    const first = page.locator('.media__picture').first()

    await expect(first.locator('img')).toHaveAttribute('loading', 'eager')
    await expect(first.locator('img')).toHaveAttribute('fetchpriority', 'high')
    // It has no dots to resolve through, and never waits.
    await expect(first.locator('canvas')).toHaveCount(0)
    await first.scrollIntoViewIfNeeded()
    await expect(first).not.toHaveAttribute('data-picture')
    await expect(first.locator('img')).toHaveCSS('opacity', '1')
  })

  test('asks for pictures only at the widths of the short list, at any size and density', async ({
    browser,
  }) => {
    test.slow()

    for (const [width, height, deviceScaleFactor] of [
      [390, 844, 3],
      [834, 1194, 2],
      [1536, 1000, 1],
      [1536, 1000, 2],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor })
      const page = await context.newPage()
      const asked: number[] = []
      page.on('request', (request) => {
        const url = new URL(request.url())
        if (url.pathname === '/_next/image') asked.push(Number(url.searchParams.get('w')))
      })
      await page.goto('/catalogue/content')
      for (const picture of await page.locator('.media__picture').all()) {
        await picture.scrollIntoViewIfNeeded()
        await expect(picture.locator('img')).toHaveJSProperty('complete', true)
      }

      expect(asked.length, `${width} × ${deviceScaleFactor}`).toBeGreaterThan(0)
      expect(asked.filter((size) => !widths.includes(size))).toEqual([])
      const offered = await page
        .locator('.media__picture img')
        .evaluateAll((images: HTMLImageElement[]) =>
          images.flatMap((image) =>
            image.srcset
              .split(', ')
              .map((candidate) => Number(candidate.split(' ')[1].slice(0, -1))),
          ),
        )
      expect([...new Set(offered)].sort((a, b) => a - b)).toEqual(widths)

      // Asked for any other width, the server refuses.
      const first = await page.locator('.media__picture img').first().getAttribute('src')
      const src = new URL(first!, 'http://localhost')
      src.searchParams.set('w', '750')
      expect((await page.request.get(`${src.pathname}${src.search}`)).status()).toBe(400)
      await context.close()
    }
  })

  test('shows the upload of a live picture until script runs, then the picture it draws', async ({
    page,
  }) => {
    const live = page.locator('.media[data-live]', { has: page.locator('img') })

    // With every script file emptied, only what the server sent is there.
    await page.route('**/*.js', (route) => route.fulfill({ contentType: 'text/javascript' }))
    await page.goto('/catalogue/content')
    await live.scrollIntoViewIfNeeded()
    await expect(live.locator('img')).toBeVisible()
    await expect(live.locator('img')).toHaveCSS('opacity', '1')
    await expect(live.locator('canvas')).toHaveCount(0)

    await page.unroute('**/*.js')
    await page.reload()
    await live.scrollIntoViewIfNeeded()
    await expect(live.locator('.media__live canvas')).toBeVisible()
    await expect(live.locator('img')).toHaveCSS('opacity', '0')
  })

  test('deciphers the segment of the path that changes, and keeps its text in the page', async ({
    page,
  }) => {
    await page.goto('/catalogue/content')
    const path = entry(page, 'Path').locator('.path')
    const cipher = (segment: string) => path.locator(`${segment} .decipher > [aria-hidden]`)

    await entry(page, 'Path').getByRole('button', { name: 'Change' }).click()
    await expect(cipher('.path__here')).not.toBeEmpty()
    await expect(cipher('span:first-child')).toBeEmpty()
    await expect(path.locator('.path__here .decipher > :last-child')).toHaveText('other item')
    await expect(cipher('.path__here')).toBeEmpty()
  })

  test('changes the lamps along the spread, at once under reduced motion', async ({ page }) => {
    await page.goto('/catalogue/content')
    const lamps = entry(page, 'Lamps').locator('.lamps').first()
    const delay = (column: number) =>
      lamps
        .locator('i')
        .nth(column)
        .evaluate((lamp) => getComputedStyle(lamp).transitionDelay)

    expect(await delay(0)).toBe('0s')
    expect(await delay(24)).toBe(`${(0.22 * 24) / 25}s`)
    await expect(lamps.locator('i').nth(24)).toHaveCSS('transition-property', 'background-color')

    // The top lamp of the last digit's first column: dark in a 4, lit in a 5.
    await expect(lamps.locator('i').nth(20)).not.toHaveAttribute('data-lamp', 'on')
    await entry(page, 'Lamps').getByRole('button', { name: 'Change' }).click()
    await expect(lamps).toHaveAttribute('aria-label', '16:45')
    await expect(lamps.locator('i').nth(20)).toHaveAttribute('data-lamp', 'on')

    await page
      .locator('.doc__sets span', { hasText: 'motion' })
      .getByRole('button', { name: 'reduce', exact: true })
      .click()
    expect(await delay(24)).toBe('0s')
  })

  test('does not pop an open dot the server painted', async ({ page }) => {
    await page.addInitScript(() => {
      const started: string[] = []
      Object.assign(window, { started })
      document.addEventListener(
        'transitionstart',
        (event) =>
          (event.target as Element).matches('.app__open') && started.push(event.propertyName),
        true,
      )
    })
    await page.goto('/catalogue/content', { waitUntil: 'networkidle' })

    await expect(page.locator('.app__open').first()).toHaveCSS('transform', 'none')
    expect(await page.evaluate(() => Reflect.get(window, 'started'))).toEqual([])
  })

  test('never sets a label smaller than its value, nor mixes weights in a heading', async ({
    page,
  }) => {
    for (const language of ['', '/de']) {
      await page.goto(`${language}/catalogue/content`)

      const stats = await page
        .locator('.stat')
        .evaluateAll((stats) =>
          stats.map((stat) =>
            [...stat.children].map((part) => getComputedStyle(part).fontSize).join(),
          ),
        )
      expect(stats.length).toBeGreaterThan(0)
      for (const sizes of stats) expect(new Set(sizes.split(',')).size).toBe(1)

      const weights = await page
        .locator('.hgroup__title')
        .evaluateAll((titles) =>
          titles.map(
            (title) =>
              new Set(
                [title, ...title.querySelectorAll('*')].map(
                  (part) => getComputedStyle(part).fontWeight,
                ),
              ).size,
          ),
        )
      expect(weights.length).toBeGreaterThan(0)
      expect(new Set(weights)).toEqual(new Set([1]))
    }
  })
})
