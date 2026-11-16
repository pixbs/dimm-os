import { devices, type Page } from '@playwright/test'

import { expect, test } from './test'

const desk = { width: 1280, height: 720 }
const phone = { width: 390, height: 844 }

const legal = {
  '': ['Imprint', 'Privacy', 'Cookies'],
  '/de': ['Impressum', 'Datenschutz', 'Cookies'],
}

type Draw = { at: number; dots: number; ink: number; x: number; y: number }

// Runs in the wallpaper's worker before its own script: every drawing is counted with its dots and the middle
// of their ink, and every frame with what it cost.
function watch() {
  const draws: Draw[] = []
  const costs: number[] = []
  Object.assign(self, { draws, costs })
  const canvas = OffscreenCanvasRenderingContext2D.prototype
  const { clearRect, arc } = canvas
  canvas.clearRect = function (...box) {
    draws.push({ at: performance.now(), dots: 0, ink: 0, x: 0, y: 0 })
    return clearRect.apply(this, box)
  }
  canvas.arc = function (x, y, radius, ...rest) {
    const draw = draws.at(-1)!
    draw.dots += 1
    draw.ink += radius * radius
    draw.x += x * radius * radius
    draw.y += y * radius * radius
    return arc.call(this, x, y, radius, ...rest)
  }
  const frame = self.requestAnimationFrame.bind(self)
  self.requestAnimationFrame = (callback) =>
    frame((at) => {
      const start = performance.now()
      callback(at)
      costs.push(performance.now() - start)
    })
}

// The page's workers wait for the watch before they start, and the CPU of the page is slowed as asked.
async function open(page: Page, path = '/', slower = 1) {
  const cdp = await page.context().newCDPSession(page)
  cdp.on('Target.attachedToTarget', ({ sessionId }) => {
    const send = (id: number, method: string, params = {}) =>
      cdp.send('Target.sendMessageToTarget', {
        sessionId,
        message: JSON.stringify({ id, method, params }),
      })
    void send(1, 'Runtime.evaluate', { expression: `(${watch})()` })
    void send(2, 'Runtime.runIfWaitingForDebugger')
  })
  await cdp.send('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: false,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: slower })
  await page.goto(path)
  await expect.poll(() => page.workers().length).toBe(1)
}

const drawn = (page: Page) =>
  page.workers()[0].evaluate(() => (Reflect.get(self, 'draws') as Draw[]).splice(0))
const costs = (page: Page) =>
  page.workers()[0].evaluate(() => (Reflect.get(self, 'costs') as number[]).splice(0))
// Where the middle of the form's ink stands, in the last drawing of a moment.
const middle = async (page: Page, wait = 0) => {
  await page.waitForTimeout(wait)
  const last = (await drawn(page)).at(-1)!
  return { x: last.x / last.ink, y: last.y / last.ink }
}
// How many drawings a second the wallpaper makes now.
const rate = async (page: Page) => {
  await drawn(page)
  await page.waitForTimeout(1000)
  return (await drawn(page)).length
}
const hide = (page: Page, hidden: boolean) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)

test.describe('Screen', () => {
  test('is a desk from 600 px wide and a phone below, whatever the device', async ({ page }) => {
    await page.setViewportSize(desk)
    await page.goto('/')
    const taskbar = page.locator('footer[data-for="desk"]')
    const home = page.locator('footer[data-for="phone"]')
    const apps = page.getByRole('navigation', { name: 'Apps' })

    for (const [width, onDesk] of [
      [1280, true],
      [599, false],
      [600, true],
      [390, false],
    ] as const) {
      await page.setViewportSize({ width, height: 800 })
      await expect(taskbar).toBeVisible({ visible: onDesk })
      await expect(home).toBeVisible({ visible: !onDesk })
      await expect(apps).toHaveCSS('display', onDesk ? 'flex' : 'grid')
    }
  })

  test('holds Imprint, Privacy, Cookies and Preferences in its tray, as words, and no Lab, Rejected ideas or Bin', async ({
    page,
  }) => {
    for (const size of [desk, phone]) {
      await page.setViewportSize(size)
      await page.goto('/')
      const tray = page.locator('footer:visible a')
      await expect(tray).toHaveText(
        size === desk
          ? ['Imprint', 'Privacy', 'Cookies', 'Preferences']
          : ['Imprint', 'Privacy', 'Cookies'],
      )
      await expect(tray.locator('svg')).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText(/\bLab\b|Rejected ideas|\bBin\b/)
    }
  })

  test('keeps both bars in view over anything on the desk, on bars that are never an accent', async ({
    page,
  }) => {
    for (const size of [desk, phone]) {
      await page.setViewportSize(size)
      await page.goto('/work')
      // A window in full screen takes the whole desk, and no more.
      await page.locator('main article').getByRole('button', { name: 'Full screen' }).click()
      await expect(page.locator('main article')).toHaveAttribute('data-full')
      for (const control of await page
        .locator(':is(header, footer) :is(.bar, .dock) :is(a, button):visible')
        .all()) {
        const onTop = await control.evaluate((control) => {
          const { x, y, width, height } = control.getBoundingClientRect()
          return (
            document.elementFromPoint(x + width / 2, y + height / 2)?.closest('a, button') ===
            control
          )
        })
        expect(onTop, (await control.textContent()) ?? undefined).toBe(true)
      }

      const accents = await page.evaluate(() => {
        const probe = document.body.appendChild(document.createElement('i'))
        return ['--orange', '--blue', '--mint'].map((name) => {
          probe.style.color = `var(${name})`
          return getComputedStyle(probe).color
        })
      })
      for (const bar of await page.locator('.bar:visible, .dock:visible').all()) {
        const surface = await bar.evaluate(
          (bar) => getComputedStyle(bar.closest('[data-surface]')!).backgroundColor,
        )
        expect(accents).not.toContain(surface)
      }
    }
  })

  test('shows each open window in the taskbar and the dock, the one in front selected', async ({
    page,
  }) => {
    await page.setViewportSize(desk)
    await page.goto('/work')
    await page.getByRole('link', { name: 'Grow' }).click()
    const taskbar = page.locator('footer[data-for="desk"] button')
    await expect(taskbar).toHaveText(['work', 'grow.case'])
    await expect(taskbar.nth(1)).toHaveAttribute('aria-current', 'true')

    await taskbar.nth(0).click()
    await expect(page).toHaveURL('/work')
    await expect(page.locator('article[data-front] h1')).toHaveText('Work')

    await page.setViewportSize(phone)
    const dock = page.getByRole('navigation', { name: 'Windows' }).getByRole('button')
    await expect(dock).toHaveText(['Work', 'Grow'])
    await expect(dock.nth(0)).toHaveAttribute('aria-current', 'true')
  })
})

test.describe('Screen without script', () => {
  test.use({ javaScriptEnabled: false })

  test('answers Imprint, Privacy and Cookies from the desk and from the phone, in both languages', async ({
    page,
  }) => {
    for (const size of [desk, phone]) {
      for (const [language, names] of Object.entries(legal)) {
        for (const name of names) {
          await page.setViewportSize(size)
          await page.goto(`${language}/`)
          await page.getByRole('link', { name, exact: true }).click()
          await expect(page.locator('article h1')).toHaveText(name)
          await expect(page.locator('html')).toHaveAttribute('lang', language ? 'de' : 'en')
        }
      }
    }
  })
})

test.describe('Wallpaper', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(desk)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  test('pours in at the start, at 30 frames a second at most', async ({ page }) => {
    await open(page)
    await page.waitForTimeout(2000)
    const draws = await drawn(page)

    // All its ink starts in the middle, and spreads into the form.
    expect(draws[0].dots).toBeLessThanOrEqual(4)
    expect(draws.at(-1)!.dots).toBeGreaterThan(500)
    const second = draws.filter(({ at }) => at > draws[0].at + 1000 && at <= draws[0].at + 2000)
    expect(second.length).toBeLessThanOrEqual(31)
    expect(second.length).toBeGreaterThan(20)
  })

  test('drifts slowly enough to look still at a glance', async ({ page }) => {
    await open(page)
    const start = await middle(page, 2000)
    const end = await middle(page, 4000)
    const moved = Math.hypot(end.x - start.x, end.y - start.y)

    expect(moved).toBeGreaterThan(2)
    expect(moved / 4).toBeLessThan(6)
  })

  test('leans toward the pointer over the empty desk, and not over what lies on it', async ({
    page,
  }) => {
    await open(page)
    await page.mouse.move(640, 700)
    const before = await middle(page, 2000)

    await page.mouse.move(300, 100, { steps: 4 })
    const leant = await middle(page, 2000)
    expect(leant.x - before.x).toBeLessThan(-12)
    expect(leant.y - before.y).toBeLessThan(-12)

    await page.getByRole('link', { name: 'Work' }).hover()
    const back = await middle(page, 2000)
    expect(back.x - leant.x).toBeGreaterThan(12)
    expect(back.y - leant.y).toBeGreaterThan(12)
  })

  test('pours to its new place as the field turns', async ({ page }) => {
    await open(page)
    const before = await middle(page, 2000)
    await page.evaluate(() => (document.documentElement.dataset.wallpaper = '999'))
    await page.waitForTimeout(2000)
    const draws = (await drawn(page)).map((draw) => draw.x / draw.ink)
    const after = draws.at(-1)!

    expect(after - before.x).toBeGreaterThan(150)
    // It flows there: some drawings stand on the way.
    expect(draws.some((x) => x > before.x + 30 && x < after - 30)).toBe(true)
  })

  test('holds still under reduced motion and under pause, and stops while hidden or covered', async ({
    page,
  }) => {
    await open(page)
    await page.waitForTimeout(1000)
    expect(await rate(page)).toBeGreaterThan(20)

    for (const [name, value] of [
      ['motion', 'reduce'],
      ['pause', 'on'],
    ]) {
      await page.evaluate(
        ([name, value]) => (document.documentElement.dataset[name] = value),
        [name, value],
      )
      await page.waitForTimeout(200)
      expect(await rate(page), name).toBe(0)
      // A pointer over the desk draws nothing on a form that holds still.
      await page.mouse.move(300, 300, { steps: 8 })
      await page.waitForTimeout(200)
      expect(await drawn(page), name).toEqual([])
      await page.evaluate((name) => delete document.documentElement.dataset[name], name)
      expect(await rate(page)).toBeGreaterThan(20)
    }

    await hide(page, true)
    await page.waitForTimeout(200)
    expect(await rate(page)).toBe(0)
    await hide(page, false)
    expect(await rate(page)).toBeGreaterThan(20)

    await page.locator('main').evaluate((desk: HTMLElement) => (desk.inert = true))
    await page.waitForTimeout(200)
    expect(await rate(page)).toBe(0)
    await page.locator('main').evaluate((desk: HTMLElement) => (desk.inert = false))
    expect(await rate(page)).toBeGreaterThan(20)
  })

  test('stops under a window in full screen, which covers the apps with it', async ({ page }) => {
    await open(page, '/work')
    await page.waitForTimeout(1000)
    expect(await rate(page)).toBeGreaterThan(20)

    const full = page.locator('main article').getByRole('button', { name: 'Full screen' })
    await full.click()
    await expect(page.locator('nav.apps')).toHaveAttribute('inert')
    await page.waitForTimeout(200)
    expect(await rate(page)).toBe(0)

    await full.click()
    await expect(page.locator('nav.apps')).not.toHaveAttribute('inert')
    expect(await rate(page)).toBeGreaterThan(20)
  })

  test('pours in without an error when a message comes before its first setting, as when a tab opened hidden is shown', async ({
    page,
  }) => {
    // Right after the canvas the page sends what a hidden tab sends once shown, and a lean.
    await page.addInitScript(() => {
      const errors: string[] = []
      Object.assign(window, { errors })
      window.Worker = class extends window.Worker {
        constructor(...args: ConstructorParameters<typeof Worker>) {
          super(...args)
          this.addEventListener('error', (event) => errors.push(event.message))
        }
        postMessage(message: unknown, transfer?: Transferable[] | StructuredSerializeOptions) {
          super.postMessage(message, transfer as StructuredSerializeOptions)
          if (message && typeof message === 'object' && 'canvas' in message) {
            super.postMessage({ runs: true })
            super.postMessage({ lean: [10, 10] })
          }
        }
      }
    })
    await open(page)
    await page.waitForTimeout(1000)

    expect((await drawn(page))[0].dots).toBeLessThanOrEqual(4)
    expect(await page.evaluate(() => Reflect.get(window, 'errors'))).toEqual([])
  })

  test('is drawn at once and still when the device asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await page.waitForTimeout(1000)
    const draws = await drawn(page)

    expect(draws[0].dots).toBeGreaterThan(500)
    expect(draws.length).toBeLessThan(4)
  })
})

// A phone of the middle range, as its own browser would open the page.
const { defaultBrowserType: _, ...pixel } = devices['Pixel 7']

test.describe('Screen on a mid-range phone', () => {
  test.use(pixel)

  test('keeps the targets with the CPU throttled: paint, input, shift and frames', async ({
    browser,
    page,
  }) => {
    test.skip(!process.env.CI, 'The targets hold for the production build, which CI serves.')

    await page.addInitScript(() => {
      const seen = { paint: 0, shift: 0, input: [] as number[] }
      Object.assign(window, { seen })
      const observe = (type: string, read: (entry: PerformanceEntry) => void) =>
        new PerformanceObserver((list) => list.getEntries().forEach(read)).observe({
          type,
          buffered: true,
          durationThreshold: 16,
        } as PerformanceObserverInit)
      observe('largest-contentful-paint', (entry) => (seen.paint = entry.startTime))
      observe('layout-shift', (entry) => {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
        if (!shift.hadRecentInput) seen.shift += shift.value
      })
      observe('event', (entry) => seen.input.push(entry.duration))
    })
    await open(page, '/', 4)
    await page.waitForTimeout(3000)

    // The main thread is traced while the wallpaper drifts; its worker runs at full speed, since a worker
    // cannot be slowed, so its time counts four times.
    await costs(page)
    await browser.startTracing(page, {
      categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'],
    })
    await page.waitForTimeout(2000)
    const trace = JSON.parse((await browser.stopTracing()).toString()) as {
      traceEvents: { name: string; tid: number; dur?: number; args?: { name?: string } }[]
    }
    const main = trace.traceEvents.find(
      (event) => event.name === 'thread_name' && event.args?.name === 'CrRendererMain',
    )!.tid
    const tasks = trace.traceEvents.filter(
      (event) => event.tid === main && event.name === 'RunTask',
    )
    expect(Math.max(...tasks.map((task) => task.dur ?? 0)) / 1000).toBeLessThanOrEqual(10)
    expect(Math.max(...(await costs(page))) * 4).toBeLessThanOrEqual(10)

    await page.getByRole('link', { name: 'Work' }).tap()
    await expect(page.locator('article[data-front] h1')).toHaveText('Work')
    const seen = await page.evaluate(
      () => Reflect.get(window, 'seen') as { paint: number; shift: number; input: number[] },
    )
    expect(seen.paint).toBeLessThanOrEqual(2500)
    expect(seen.shift).toBeLessThan(0.1)
    expect(Math.max(0, ...seen.input)).toBeLessThanOrEqual(200)
  })
})
