import { devices, type Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

const desk = { width: 1280, height: 720 }
const phone = { width: 390, height: 844 }

// Each link and the heading of the window it opens; Cookies opens the consent.
const legal = {
  '': [
    ['Imprint', 'Imprint'],
    ['Privacy', 'Privacy'],
    ['Cookies', 'Your consent'],
  ],
  '/de': [
    ['Impressum', 'Impressum'],
    ['Datenschutz', 'Datenschutz'],
    ['Cookies', 'Ihre Einwilligung'],
  ],
}

type Draw = {
  at: number
  dots: number
  signs: number
  inks: string[]
  ink: number
  x: number
  y: number
}

// Runs in the wallpaper's worker before its own script: every drawing is counted with its dots, its signs, its inks
// and the middle of its ink, and every frame with what it cost.
function watch() {
  const draws: Draw[] = []
  const costs: number[] = []
  Object.assign(self, { draws, costs })
  const canvas = OffscreenCanvasRenderingContext2D.prototype
  const { clearRect, arc, fillText } = canvas
  // The small canvas the face is measured on is no drawing.
  const shown = (context: OffscreenCanvasRenderingContext2D) => context.canvas.width > 100
  const inked = (context: OffscreenCanvasRenderingContext2D) => {
    const draw = draws.at(-1)!
    if (!draw.inks.includes(String(context.fillStyle))) draw.inks.push(String(context.fillStyle))
    return draw
  }
  canvas.clearRect = function (...box) {
    if (shown(this))
      draws.push({ at: performance.now(), dots: 0, signs: 0, inks: [], ink: 0, x: 0, y: 0 })
    return clearRect.apply(this, box)
  }
  canvas.arc = function (x, y, radius, ...rest) {
    const draw = inked(this)
    draw.dots += 1
    draw.ink += radius * radius
    draw.x += x * radius * radius
    draw.y += y * radius * radius
    return arc.call(this, x, y, radius, ...rest)
  }
  canvas.fillText = function (...text) {
    if (shown(this)) inked(this).signs += 1
    return fillText.apply(this, text)
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
    const apps = page.getByRole('navigation', { name: 'Apps' })

    for (const [width, onDesk] of [
      [1280, true],
      [599, false],
      [600, true],
      [390, false],
    ] as const) {
      await page.setViewportSize({ width, height: 800 })
      await expect(taskbar).toBeVisible({ visible: onDesk })
      // A phone has nothing at its foot.
      await expect(page.locator('footer:visible')).toHaveCount(onDesk ? 1 : 0)
      // Cells down a column on a desk, four across on a phone.
      await expect(apps).toHaveCSS('grid-auto-flow', onDesk ? 'column' : 'row')
    }
  })

  test('holds Preferences in its tray on a desk, as a word, and no Lab, Rejected ideas or Bin', async ({
    page,
  }) => {
    for (const size of [desk, phone]) {
      await page.setViewportSize(size)
      await page.goto('/')
      const tray = page.locator('footer:visible a')
      await expect(tray).toHaveText(size === desk ? ['Preferences'] : [])
      await expect(tray.locator('svg')).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText(/\bLab\b|Rejected ideas|\bBin\b/)
    }
  })

  test('keeps both bars in view over anything on the desk, on bars that are never an accent', async ({
    page,
  }) => {
    for (const size of [desk, phone]) {
      await page.setViewportSize(size)
      await page.goto('/work', { waitUntil: 'networkidle' })
      // A window in full screen takes the whole desk, and no more. On a phone the window is a drawer under the
      // menu bar, which stays over its handle.
      if (size === desk) {
        await page.locator('main article').getByRole('button', { name: 'Full screen' }).click()
        await expect(page.locator('main article')).toHaveAttribute('data-full')
      }
      const bars = size === desk ? ':is(header, footer)' : 'header'
      for (const control of await page.locator(`${bars} .bar :is(a, button):visible`).all()) {
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
      for (const bar of await page.locator('.bar:visible').all()) {
        const surface = await bar.evaluate(
          (bar) => getComputedStyle(bar.closest('[data-surface]')!).backgroundColor,
        )
        expect(accents).not.toContain(surface)
      }
    }
  })

  test('shows each open window in the taskbar, the one in front selected, and on a phone nothing', async ({
    page,
  }) => {
    await page.setViewportSize(desk)
    await page.goto('/work')
    await page
      .getByRole('navigation', { name: 'Apps' })
      .getByRole('link', { name: 'Services' })
      .click()
    const taskbar = page.locator('footer[data-for="desk"] button')
    await expect(taskbar).toHaveText(['work', 'services'])
    await expect(taskbar.nth(1)).toHaveAttribute('aria-current', 'true')

    await taskbar.nth(0).click()
    await expect(page).toHaveURL('/work')
    await expect(page.locator('article[data-front] h1')).toHaveText('Work')

    await page.setViewportSize(phone)
    await expect(page.locator('footer:visible')).toHaveCount(0)
  })
})

test.describe('Screen without script', () => {
  test.use({ javaScriptEnabled: false })

  test('answers Imprint, Privacy and Cookies from the desk and from the phone, in both languages', async ({
    page,
  }) => {
    for (const size of [desk, phone]) {
      for (const [language, names] of Object.entries(legal)) {
        for (const [name, heading] of names) {
          await page.setViewportSize(size)
          await page.goto(`${language}/`)
          await page.getByRole('link', { name, exact: true }).click()
          await expect(page.locator('article h1')).toHaveText(heading)
          await expect(page.locator('html')).toHaveAttribute('lang', language ? 'de' : 'en')
        }
      }
    }
  })
})

test.describe('Wallpaper', () => {
  test.beforeEach(async ({ page }) => {
    await emptyDesk(page)
    await page.setViewportSize(desk)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  test('shows Passage from the start, at 30 frames a second at most', async ({ page }) => {
    await open(page)
    await page.waitForTimeout(2000)
    const draws = await drawn(page)

    expect(draws[0].dots).toBeGreaterThan(100)
    const second = draws.filter(({ at }) => at > draws[0].at + 1000 && at <= draws[0].at + 2000)
    expect(second.length).toBeLessThanOrEqual(31)
    expect(second.length).toBeGreaterThan(20)
  })

  test('is drawn in dots or in signs, in colour at the strength of muted and without at that of a line', async ({
    page,
  }) => {
    await open(page)
    const canvas = page.locator('.wallpaper canvas')

    for (const [step, strength] of [
      ['passage dots colour', '0.64'],
      ['passage dots', '0.16'],
      ['passage ascii colour', '0.64'],
      ['passage ascii', '0.16'],
      // A field number of an earlier visit is the default.
      ['301', '0.64'],
    ]) {
      await page.evaluate((step) => (document.documentElement.dataset.wallpaper = step), step)
      await expect(canvas, step).toHaveCSS('opacity', strength)
      await page.waitForTimeout(500)
      const last = (await drawn(page)).at(-1)!
      const signs = step.includes('ascii')
      expect(last.dots > 0, step).toBe(!signs)
      expect(last.signs > 0, step).toBe(signs)
      expect(last.inks.length > 1, step).toBe(strength === '0.64')
    }
  })

  test('starts afresh on another dot', async ({ page }) => {
    await open(page)
    await page.waitForTimeout(1000)
    // Held still, it is drawn once for each change, so the last drawing is the scene as it stands.
    const stands = async (name: string, value: string) => {
      await page.evaluate(
        ([name, value]) => (document.documentElement.dataset[name] = value),
        [name, value],
      )
      await page.waitForTimeout(300)
      const { at: _, ...last } = (await drawn(page)).at(-1)!
      return last
    }
    const moved = await stands('pause', 'on')
    await stands('pitch', '12')
    const fresh = await stands('pitch', '8')

    expect(fresh).not.toEqual(moved)
    await stands('pitch', '12')
    expect(await stands('pitch', '8')).toEqual(fresh)
  })

  test('reads the pointer and a press over the desk, not through a window', async ({ page }) => {
    await page.addInitScript(() => {
      const pointers: unknown[] = []
      const presses: unknown[] = []
      Object.assign(window, { pointers, presses })
      window.Worker = class extends window.Worker {
        postMessage(message: unknown, transfer?: Transferable[] | StructuredSerializeOptions) {
          if (message && typeof message === 'object' && 'pointer' in message)
            pointers.push(message.pointer)
          if (message && typeof message === 'object' && 'held' in message)
            presses.push(message.held)
          super.postMessage(message, transfer as StructuredSerializeOptions)
        }
      }
    })
    await open(page, '/work')
    const last = (name: string) =>
      page.evaluate((name) => (Reflect.get(window, name) as unknown[]).at(-1), name)

    await page.getByRole('link', { name: 'Services' }).hover()
    expect(await last('pointers')).toHaveLength(2)
    const box = (await page.locator('main article').boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 10)
    expect(await last('pointers')).toBeNull()
    await page.mouse.down()
    expect(await last('presses')).toBeUndefined()
    await page.mouse.up()

    // A press on the desk holds until it is let go.
    const desk = (await page.locator('main').boundingBox())!
    await page.mouse.move(desk.x + desk.width - 10, desk.y + desk.height - 10)
    await page.mouse.down()
    expect(await last('presses')).toBe(true)
    await page.mouse.up()
    expect(await last('presses')).toBe(false)
  })

  test('holds still under reduced motion and under pause, and stops while hidden or covered', async ({
    page,
  }) => {
    await open(page)
    await page.waitForTimeout(1000)
    expect(await rate(page)).toBeGreaterThan(20)
    // Two pictures of the desk a second apart.
    const pictures = async () => {
      const before = await page.locator('main').screenshot()
      await page.waitForTimeout(1000)
      return before.equals(await page.locator('main').screenshot())
    }
    expect(await pictures()).toBe(false)

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
      expect(await pictures(), name).toBe(true)
      // A pointer over the desk draws nothing on a scene that holds still.
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

  test('is not drawn as a plain wallpaper', async ({ page }) => {
    await open(page)
    const canvas = page.locator('.wallpaper canvas')
    await expect(canvas).toHaveCount(1)

    await page.evaluate(() => (document.documentElement.dataset.plain = 'on'))
    await expect(canvas).toHaveCount(0)
    await expect.poll(() => page.workers().length).toBe(0)
    await page.evaluate(() => (document.documentElement.dataset.plain = 'off'))
    await expect(canvas).toHaveCount(1)
    await expect.poll(() => page.workers().length).toBe(1)
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

  test('is drawn without an error when a message comes before its first setting, as when a tab opened hidden is shown', async ({
    page,
  }) => {
    // Right after the canvas the page sends what a hidden tab sends once shown, and a pointer.
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
            super.postMessage({ pointer: [10, 10] })
          }
        }
      }
    })
    await open(page)
    await page.waitForTimeout(1000)

    expect((await drawn(page))[0].dots).toBeGreaterThan(100)
    expect(await page.evaluate(() => Reflect.get(window, 'errors'))).toEqual([])
  })

  test('is drawn once and still when the device asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await page.waitForTimeout(1000)
    const draws = await drawn(page)

    expect(draws[0].dots).toBeGreaterThan(100)
    expect(draws.length).toBeLessThan(4)
  })

  test('is drawn once and still while generated visuals are paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => localStorage.setItem('pause', 'on'))
    await open(page)
    await page.waitForTimeout(1000)
    const draws = await drawn(page)

    expect(draws[0].dots).toBeGreaterThan(100)
    expect(draws.length).toBeLessThan(4)
  })

  test('causes no task over 50 ms', async ({ page }) => {
    await open(page)
    await page.waitForTimeout(3000)
    await costs(page)
    const long = await page.evaluate(
      () =>
        new Promise<number[]>((done) => {
          const tasks: number[] = []
          new PerformanceObserver((list) =>
            tasks.push(...list.getEntries().map((entry) => entry.duration)),
          ).observe({ type: 'longtask' })
          setTimeout(() => done(tasks), 2000)
        }),
    )

    expect(long).toEqual([])
    expect(Math.max(...(await costs(page)))).toBeLessThanOrEqual(50)
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
    await emptyDesk(page)
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
