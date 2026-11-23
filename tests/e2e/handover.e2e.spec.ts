import type { Page } from '@playwright/test'

import { expect, test } from './test'

const waiting = (page: Page) => page.locator('.screen[data-waiting]')
const sizes = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
}
// The parts watched: the first of each that is shown, on the desk or on the screen that waits over it.
const parts = {
  bar: [
    '.screen:not([data-waiting]) > header .menubar > :not(:has(.mark))',
    '.screen:not([data-waiting]) > header .bar > button:not([data-visitor])',
  ].join(', '),
  taskbar: '.screen:not([data-waiting]) > footer',
  app: '.screen:not([data-waiting]) .screen__desk > .apps > *',
  window: '.screen:not([data-waiting]) .screen__desk > .window .window__frame',
  screen: '.screen[data-waiting] .screen__main > *',
  foot: '.screen[data-waiting] .screen__foot',
  row: '.screen[data-waiting] .list > .row:last-child',
  bottom: '.screen[data-waiting] > footer',
}
type Part = keyof typeof parts
// A frame: its time since the press, whether the desk can be pressed and a screen waits, each part as
// [opacity, x, y, width, height] or absent, and the animations that ran, as their length and what they change.
type Frame = {
  t: number
  inert: boolean
  waiting: boolean
  parts: Partial<Record<Part, number[]>>
  moves: [number, string][]
}

// Watches the parts frame by frame from the press or key that `go` makes, for two seconds.
async function watch(page: Page, go: () => Promise<unknown>) {
  await page.evaluate((parts) => {
    const frames: Frame[] = []
    let start = 0
    Object.assign(window, { seen: frames, watched: false })
    const pressed = () => (start ||= performance.now())
    addEventListener('click', pressed, { capture: true, once: true })
    addEventListener('keydown', pressed, { capture: true, once: true })
    requestAnimationFrame(function look(now) {
      if (!start) return requestAnimationFrame(look)
      const shown: Frame['parts'] = {}
      for (const [name, selector] of Object.entries(parts)) {
        const part = [...document.querySelectorAll(selector)].find((one) => one.checkVisibility())
        if (!part) continue
        let opacity = getComputedStyle(part).visibility === 'hidden' ? 0 : 1
        for (let at: Element | null = part; at; at = at.parentElement)
          opacity *= Number(getComputedStyle(at).opacity)
        const { x, y, width, height } = part.getBoundingClientRect()
        shown[name as Part] = [opacity, x, y, width, height].map(
          (one) => Math.round(one * 100) / 100,
        )
      }
      const moves = document.getAnimations().map((move): [number, string] => {
        const keys = (move.effect as KeyframeEffect).getKeyframes()
        const changed =
          move instanceof CSSTransition
            ? move.transitionProperty
            : [...new Set(keys.flatMap(Object.keys))].join(' ')
        return [Number(move.effect!.getTiming().duration), changed]
      })
      const desk = document.querySelector<HTMLElement>('.screen[data-fill]:not([data-waiting])')!
      const over = !!document.querySelector('.screen[data-waiting]')
      frames.push({ t: now - start, inert: desk.inert, waiting: over, parts: shown, moves })
      if (now - start < 2000) requestAnimationFrame(look)
      else Object.assign(window, { watched: true })
    })
  }, parts)
  await go()
  await page.waitForFunction(() => Reflect.get(window, 'watched'))
  const frames = await page.evaluate(() => Reflect.get(window, 'seen') as Frame[])
  const opacity = (frame: Frame, part: Part) => frame.parts[part]?.[0] ?? 0
  return {
    frames,
    // When a part first shows, and when it is first gone after it showed.
    shows: (part: Part) => frames.find((frame) => opacity(frame, part) > 0.05)?.t ?? Infinity,
    starts: (part: Part) => frames.find((frame) => opacity(frame, part) < 0.95)?.t ?? Infinity,
    gone: (part: Part) => {
      const seen = frames.findIndex((frame) => opacity(frame, part) > 0.05)
      return frames.slice(seen).find((frame) => opacity(frame, part) < 0.05)?.t ?? Infinity
    },
  }
}

// Locks the desk, and waits until the login has arrived and the windows have gone to the taskbar.
async function lock(page: Page) {
  await page.locator('header [data-visitor]').click()
  await expect(waiting(page).getByRole('button', { name: 'Enter' })).toBeVisible()
  await expect(page.locator('.screen__desk > .window:not([hidden])')).toHaveCount(0)
  await page.waitForFunction(() =>
    document.getAnimations().every((one) => one.playState !== 'running'),
  )
}

test.describe('The hand-over between a screen that waits and the desk', () => {
  for (const [name, size] of Object.entries(sizes)) {
    test(`from the login the desk arrives in turn, at rest within 1.2 s and pressed by nothing before, on a ${name}`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await page.goto('/', { waitUntil: 'networkidle' })
      // The wallpaper behind the login is the desk's, and goes on.
      await page.locator('.wallpaper > canvas').evaluate((canvas) => (canvas.id = 'kept'))
      await lock(page)
      await expect(waiting(page).locator('.wallpaper')).toHaveCount(0)

      const way = await watch(page, () =>
        waiting(page).getByRole('button', { name: 'Enter' }).click(),
      )
      const order = (['bar', 'taskbar', 'app', 'window'] as const)
        .filter((part) => name !== 'phone' || part !== 'taskbar')
        .map(way.shows)
      expect(way.starts('screen')).toBeLessThan(order[0])
      expect(order).toEqual([...order].sort((one, other) => one - other))
      expect(order.at(-1)).toBeLessThan(Infinity)

      // The screen goes, and the desk can be pressed, once every part stands where it ends.
      const free = way.frames.findIndex((frame) => !frame.inert)
      expect(way.frames[free].t).toBeLessThan(1200)
      expect(way.frames[free].waiting).toBe(false)
      expect(way.frames[free].parts).toEqual(way.frames.at(-1)!.parts)
      await expect(page.locator('#kept')).toHaveCount(1)
    })
  }

  test('locking, the desk leaves together and the login arrives in turn after it', async ({
    page,
  }) => {
    await page.setViewportSize(sizes.desktop)
    await page.goto('/', { waitUntil: 'networkidle' })
    const way = await watch(page, () => page.locator('header [data-visitor]').click())
    const gone = (['bar', 'taskbar', 'app', 'window'] as const).map(way.gone)
    expect(new Set(gone).size).toBe(1)
    expect(way.shows('screen')).toBeGreaterThanOrEqual(gone[0])
    expect(way.shows('screen')).toBeLessThan(way.shows('foot'))
  })

  test.describe('from the start', () => {
    test.use({ intro: true })

    test('a guest meets the desk once the rows and the bar of the boot have left', async ({
      page,
    }) => {
      await page.setViewportSize(sizes.desktop)
      await page.goto('/')
      await expect(waiting(page).getByText('Memory test')).toBeVisible()
      const way = await watch(page, () => page.keyboard.press('x'))
      expect(way.gone('row')).toBeLessThanOrEqual(way.shows('bar'))
      expect(way.gone('bottom')).toBeLessThanOrEqual(way.shows('bar'))
      expect(way.shows('window')).toBeLessThan(Infinity)
      await expect(waiting(page)).toHaveCount(0)
    })
  })

  test('shutting down, the windows go to the taskbar, then the apps, the taskbar and the menu bar leave in turn', async ({
    page,
  }) => {
    await page.setViewportSize(sizes.desktop)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Dimm OS' }).click()
    const way = await watch(page, () => page.getByRole('menuitem', { name: 'Shut down' }).click())
    const order = (['window', 'app', 'taskbar', 'bar'] as const).map(way.gone)
    expect(order).toEqual([...order].sort((one, other) => one - other))
    expect(way.starts('app')).toBeGreaterThanOrEqual(way.gone('window'))
    expect(way.shows('screen')).toBeGreaterThanOrEqual(order.at(-1)!)
    await expect(waiting(page).getByText('It’s now safe to close this tab.')).toBeVisible()
  })

  test('with reduced motion, locking, entering and shutting down are each one fade over fast', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(sizes.desktop)
    await page.goto('/', { waitUntil: 'networkidle' })
    const fast = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style.transitionDuration = 'var(--m-fast)'
      const time = parseFloat(getComputedStyle(probe).transitionDuration) * 1000
      probe.remove()
      return time
    })
    const ways = [await watch(page, () => page.locator('header [data-visitor]').click())]
    ways.push(await watch(page, () => waiting(page).getByRole('button', { name: 'Enter' }).click()))
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Dimm OS' }).click()
    ways.push(await watch(page, () => page.getByRole('menuitem', { name: 'Shut down' }).click()))
    for (const way of ways) {
      const moves = way.frames.flatMap((frame) => frame.moves)
      expect(moves.length).toBeGreaterThan(0)
      for (const [time, changed] of moves) {
        expect(time).toBeLessThanOrEqual(fast)
        expect(changed).not.toMatch(/transform|translate|scale|left|top|width|height/)
      }
    }
  })
})
