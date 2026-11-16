import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

const screen = { width: 1280, height: 720 }

// One frame of a part: its scale, its travel, its strength, and where it stands.
type Seen = { scale: number; x: number; opacity: number; left: number; top: number; width: number }

// Every frame, how the parts under a selector stand, from before whatever is done next.
const watch = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    const seen: Seen[][] = []
    Object.assign(window, { seen })
    requestAnimationFrame(function look() {
      seen.push(
        [...document.querySelectorAll(selector)].map((part) => {
          const style = getComputedStyle(part)
          const { a, e } = new DOMMatrix(style.transform)
          const { left, top, width } = part.getBoundingClientRect()
          return { scale: a, x: e, opacity: Number(style.opacity), left, top, width }
        }),
      )
      requestAnimationFrame(look)
    })
  }, selector)
const seen = (page: Page) =>
  page.evaluate(() => (Reflect.get(window, 'seen') as Seen[][]).splice(0))
// The frames of the first part, or of the part at a place, while it was there.
const first = (frames: Seen[][], at = 0) => frames.flatMap((parts) => parts[at] ?? [])

const centre = async (part: Locator) => {
  const box = (await part.boundingBox())!
  return [box.x + box.width / 2, box.y + box.height / 2]
}
const timing = (part: Locator) =>
  part.evaluate((part) => {
    const timing = part.getAnimations()[0]?.effect?.getTiming()
    return [timing?.duration, String(timing?.easing).replace(/\(.*/, '')]
  })
const control = (window: Locator, name: string) => window.getByRole('button', { name })
const drag = async (page: Page, from: Locator, dx: number, dy: number, at = { x: 8, y: 8 }) => {
  const box = (await from.boundingBox())!
  await page.mouse.move(box.x + at.x, box.y + at.y)
  await page.mouse.down()
  await page.mouse.move(box.x + at.x + dx, box.y + at.y + dy, { steps: 4 })
}

test.describe('Window, in the catalogue', () => {
  let desk: Locator
  const open = (name: string) => desk.getByRole('link', { name }).click()
  const setting = (page: Page, name: string, value: string) =>
    page.locator('.doc__sets span', { hasText: name }).getByRole('button', { name: value }).click()

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
    desk = page.locator('.played > .screen')
    await desk.scrollIntoViewIfNeeded()
  })

  test('opens out of the centre of its opener on the spring and closes back into it fast, or opens from 96% at its own place', async ({
    page,
  }) => {
    const part = page.locator('#window-one .window__origin')
    await watch(page, '#window-one .window__origin')
    await open('one')
    await expect.poll(() => timing(part)).toEqual([expect.any(Number), 'linear'])
    await expect(part).toHaveCSS('opacity', '1')
    expect(Math.min(...first(await seen(page)).map(({ scale }) => scale))).toBeLessThan(0.5)
    const [x, y] = await centre(desk.getByRole('link', { name: 'one' }))
    const origin = await part.evaluate((part) => {
      const { left, top } = part.getBoundingClientRect()
      const [x, y] = getComputedStyle(part).transformOrigin.split(' ').map(parseFloat)
      return [left + x, top + y]
    })
    expect(origin[0]).toBeCloseTo(x, 0)
    expect(origin[1]).toBeCloseTo(y, 0)

    await control(page.locator('#window-one'), 'Close').click()
    await expect.poll(() => timing(part)).toEqual([160, 'cubic-bezier'])
    await expect(part).toHaveCount(0)
    expect(first(await seen(page)).at(-1)!.scale).toBeLessThan(0.5)
    await expect(desk.locator('footer button')).toHaveCount(0)

    await watch(page, '#window-other .window__origin')
    await page.getByRole('button', { name: 'Open with no opener' }).click()
    await expect(page.locator('#window-other .window__origin')).toHaveCSS('opacity', '1')
    const scales = first(await seen(page)).map(({ scale }) => scale)
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.96)
    expect(Math.min(...scales)).toBeLessThan(1)
  })

  test('minimises into its taskbar button, whose mark turns hollow as it arrives, and stays in the taskbar', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    const button = desk.locator('footer button')
    await open('one')
    await expect(window.locator('.window__origin')).toHaveCSS('opacity', '1')
    await expect(button.locator('.mark')).toHaveCSS('transition-delay', '0s')

    await watch(page, '#window-one .window__origin')
    await control(window, 'Minimise').click()
    await expect
      .poll(() => timing(window.locator('.window__origin')))
      .toEqual([320, 'cubic-bezier'])
    await expect(window).toBeHidden()
    const [x, y] = await centre(button)
    const last = first(await seen(page))
      .filter(({ width }) => width > 0)
      .at(-1)!
    expect(Math.abs(last.left + last.width / 2 - x)).toBeLessThan(8)
    expect(Math.abs(last.top - y)).toBeLessThan(8)
    await expect(button).toHaveText('one')
    await expect(button.locator('.mark')).toHaveAttribute('data-tone', 'off')
    await expect(button.locator('.mark')).toHaveCSS('transition-delay', '0.32s')

    // Its button brings it back out of the taskbar.
    await button.click()
    await expect(window.locator('.window__origin')).toHaveCSS('opacity', '1')
    const back = first(await seen(page)).find(({ width }) => width > 0)!
    expect(Math.abs(back.left + back.width / 2 - x)).toBeLessThan(40)
  })

  test('goes to full screen as one frame that travels to the desk while its content fades out and back in', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    await open('one')
    await expect(window.locator('.window__origin')).toHaveCSS('opacity', '1')
    const before = (await window.boundingBox())!

    await watch(page, '#window-one .window__frame, #window-one .window__content')
    await control(window, 'Full screen').click()
    await expect(control(window, 'Full screen')).toHaveAttribute('aria-pressed', 'true')
    const ground = (await desk.locator('main').boundingBox())!
    await expect
      .poll(async () => (await window.locator('.window__frame').boundingBox())!.width)
      .toBe(ground.width)
    await page.waitForTimeout(400)
    const frames = await seen(page)
    const widths = first(frames).map(({ width }) => Math.round(width))
    expect(widths.some((width) => width > before.width + 8 && width < ground.width - 8)).toBe(true)
    expect(Math.min(...first(frames, 1).map(({ opacity }) => opacity))).toBeLessThan(0.1)
    expect(first(frames, 1).at(-1)!.opacity).toBe(1)
    expect(await window.boundingBox()).toEqual(ground)

    // Enter with the bar in focus is full screen too, and back.
    await window.locator('.window__bar').press('Enter')
    await expect.poll(async () => (await window.boundingBox())!.width).toBe(before.width)
  })

  test('comes to the front without travelling: the handle and the filled controls fade in', async ({
    page,
  }) => {
    await open('one')
    await open('two')
    const [behind, front] = [page.locator('#window-one'), page.locator('#window-two')]
    await expect(front.locator('.window__origin')).toHaveCSS('opacity', '1')
    await expect(behind).not.toHaveAttribute('data-front')
    await expect(behind.locator('.bar__grip')).toHaveCSS('opacity', '0')
    const boxes = [await behind.boundingBox(), await front.boundingBox()]

    await behind.locator('.window__bar').click({ position: { x: 16, y: 16 } })
    await expect(behind).toHaveAttribute('data-front')
    await expect(front).not.toHaveAttribute('data-front')
    await expect(behind.locator('.bar__grip')).toHaveCSS('transition-duration', '0.16s')
    await expect(behind.locator('.bar__grip')).toHaveCSS('opacity', '1')
    await expect(front.locator('.bar__grip')).toHaveCSS('opacity', '0')
    expect([await behind.boundingBox(), await front.boundingBox()]).toEqual(boxes)
    expect(await behind.evaluate((window) => Number(getComputedStyle(window).zIndex))).toBe(2)
  })

  test('follows the pointer exactly when dragged, and resizes in steps of 8 with its real size shown', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    await open('one')
    await expect(window.locator('.window__origin')).toHaveCSS('opacity', '1')
    const from = (await window.boundingBox())!
    const placed = await window.getAttribute('style')

    // The transform is written on the element, and the manager hears of it on release alone.
    await drag(page, window.locator('.window__bar'), 123, 45, { x: 200, y: 8 })
    expect(await window.boundingBox()).toMatchObject({ x: from.x + 123, y: from.y + 45 })
    expect(await window.getAttribute('style')).toContain(placed!)
    expect(await window.evaluate((window) => window.style.transform)).toMatch(/^translate/)
    await page.mouse.up()
    expect(await window.boundingBox()).toMatchObject({ x: from.x + 123, y: from.y + 45 })
    expect(await window.evaluate((window) => window.style.transform)).toBe('')

    // A pointer the browser takes away leaves the window where the drag last had it.
    await drag(page, window.locator('.window__bar'), -40, -16, { x: 200, y: 8 })
    await window
      .locator('.window__bar')
      .dispatchEvent('pointercancel', { pointerId: 1, clientX: 0, clientY: 0 })
    await page.mouse.up()
    expect(await window.boundingBox()).toMatchObject({ x: from.x + 83, y: from.y + 29 })

    // A pull gives the element its own size, in steps of 8, and a tag says it.
    await drag(page, window.locator('.window__grip'), 37, 21, { x: 18, y: 18 })
    const size = (await window.locator('.window__size').textContent())!
    const [width, height] = size.split(' × ').map(Number)
    expect([width, height]).toEqual([from.width + 40, from.height + 24])
    expect(
      await window.evaluate((window: HTMLElement) => [window.offsetWidth, window.offsetHeight]),
    ).toEqual([width, height])

    // Several moves within one frame write one new size.
    const sizes = await window.evaluate(async (window: HTMLElement) => {
      const frames = async () => {
        await new Promise((frame) => requestAnimationFrame(frame))
        await new Promise((frame) => requestAnimationFrame(frame))
      }
      const sizes: string[] = []
      await frames()
      new MutationObserver(() => sizes.push(window.style.width)).observe(window, {
        attributeFilter: ['style'],
      })
      const grip = window.querySelector('.window__grip')!
      const { x, y } = grip.getBoundingClientRect()
      for (let step = 1; step <= 6; step++) {
        grip.dispatchEvent(new PointerEvent('pointermove', { clientX: x + step * 16, clientY: y }))
      }
      await frames()
      return [...new Set(sizes)]
    })
    expect(sizes).toHaveLength(1)

    await page.mouse.up()
    await expect(window.locator('.window__size')).toHaveCount(0)
    expect(await window.boundingBox()).toMatchObject({ width, height })
    expect(await window.evaluate((window: HTMLElement) => window.style.width)).toBe('')
  })

  test('replaces its content with what comes one step from the direction of travel while the old fades', async ({
    page,
  }) => {
    const specimen = page.locator('article', { has: page.getByRole('button', { name: 'Next' }) })
    await specimen.scrollIntoViewIfNeeded()
    const views = specimen.locator('.window__view')

    await specimen.evaluate((window) => window.setAttribute('data-watched', ''))
    for (const [button, from] of [
      ['Next', 24],
      ['Previous', -24],
    ] as const) {
      const old = await views.textContent()
      await watch(page, '[data-watched] .window__view')
      await specimen.getByRole('button', { name: button }).click()
      await expect(views).toHaveCount(1)
      await expect(views).not.toHaveText(old!)
      await expect(views).toHaveCSS('opacity', '1')
      // Two views are there at once, the old before the new: it only fades, the new travels in from a step away.
      const frames = (await seen(page)).filter((parts) => parts.length === 2)
      expect(frames.length).toBeGreaterThan(2)
      expect(first(frames, 0).every(({ x }) => x === 0)).toBe(true)
      expect(first(frames, 0).at(-1)!.opacity).toBeLessThan(first(frames, 0)[0].opacity)
      const offsets = first(frames, 1).map(({ x }) => x)
      const start = from > 0 ? Math.max(...offsets) : Math.min(...offsets)
      expect(Math.abs(start)).toBeGreaterThan(12)
      expect(Math.abs(start)).toBeLessThanOrEqual(24)
      expect(Math.sign(start)).toBe(Math.sign(from))
    }
  })

  test('opens a waiting window at once, shows busy dots only after 300 ms, and fills it when its view arrives', async ({
    page,
  }) => {
    // When the window, its dots and its heading each arrive, counted from the press.
    await desk.evaluate((desk) => {
      const times: Record<string, number> = {}
      Object.assign(window, { times })
      desk.addEventListener('click', () => (times.press = performance.now()), true)
      new MutationObserver(() => {
        for (const [name, selector] of Object.entries({
          window: '#window-slow',
          dots: '#window-slow .dots',
          heading: '#window-slow h2',
        })) {
          if (document.querySelector(selector)) times[name] ??= performance.now()
        }
      }).observe(desk, { childList: true, subtree: true })
    })
    await open('slow')
    await expect(page.locator('#window-slow').getByRole('heading')).toHaveText('slow')
    await expect(page.locator('#window-slow .dots')).toHaveCount(0)

    const times = await page.evaluate(() => Reflect.get(window, 'times') as Record<string, number>)
    expect(times.window - times.press).toBeLessThan(100)
    expect(times.dots - times.press).toBeGreaterThanOrEqual(300)
    expect(times.heading).toBeGreaterThan(times.dots)
  })

  test('fades in place under reduced motion, and drags as before', async ({ page }) => {
    await setting(page, 'motion', 'reduce')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    await desk.scrollIntoViewIfNeeded()
    const window = page.locator('#window-one')
    const part = window.locator('.window__origin')

    await watch(page, '#window-one .window__origin')
    await open('one')
    await expect(part).toHaveCSS('opacity', '1')
    await control(window, 'Minimise').click()
    await expect(window).toBeHidden()
    await desk.locator('footer button').click()
    await expect(part).toHaveCSS('opacity', '1')
    const moved = first(await seen(page)).filter(({ width }) => width > 0)
    expect(moved.every(({ scale }) => scale === 1)).toBe(true)
    expect(moved.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true)

    // To full screen the frame is there at once, and its content still fades.
    const before = (await window.boundingBox())!.width
    await watch(page, '#window-one .window__frame, #window-one .window__content')
    await control(window, 'Full screen').click()
    await expect(control(window, 'Full screen')).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(400)
    const frames = await seen(page)
    const ground = (await desk.locator('main').boundingBox())!.width
    expect(first(frames).every(({ width }) => [before, ground].includes(Math.round(width)))).toBe(
      true,
    )
    expect(Math.min(...first(frames, 1).map(({ opacity }) => opacity))).toBeLessThan(0.1)
    await control(window, 'Full screen').click()
    await expect(control(window, 'Full screen')).toHaveAttribute('aria-pressed', 'false')

    const from = (await window.boundingBox())!
    await drag(page, window.locator('.window__bar'), 60, 30, { x: 200, y: 8 })
    await page.mouse.up()
    expect(await window.boundingBox()).toMatchObject({ x: from.x + 60, y: from.y + 30 })

    // What replaces a view fades in where it is.
    const specimen = page.locator('article', { has: page.getByRole('button', { name: 'Next' }) })
    await specimen.evaluate((window) => window.setAttribute('data-watched', ''))
    await watch(page, '[data-watched] .window__view')
    await specimen.getByRole('button', { name: 'Next' }).click()
    await expect(specimen.locator('.window__view')).toHaveCount(1)
    expect((await seen(page)).flat().every(({ x }) => x === 0)).toBe(true)
  })
})

test.describe('Window, on the desk', () => {
  const window = (page: Page, name = 'Work') => page.locator(`article[aria-label="${name}"]`)
  const ground = async (page: Page) => (await page.locator('main').boundingBox())!

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(screen)
    await page.goto('/work', { waitUntil: 'networkidle' })
  })

  test('is moved and resized by pointer and by keys, and never leaves the desk', async ({
    page,
  }) => {
    const work = window(page)
    const bar = work.locator('.window__bar')
    const desk = await ground(page)

    // With the bar in focus the arrows move the window, and Shift with them resizes it.
    await bar.focus()
    const before = (await work.boundingBox())!
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => work.boundingBox()).toMatchObject({ x: before.x + 8, y: before.y + 8 })
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowUp')
    await expect
      .poll(() => work.boundingBox())
      .toMatchObject({ width: before.width - 8, height: before.height - 8 })

    // Pulling the west edge leaves the east edge where it is, and the size never goes under 360 × 200.
    const east = before.x + 8 + before.width - 8
    await drag(page, work.locator('[data-edge="w"]'), 3000, 0, { x: 1, y: 40 })
    await page.mouse.up()
    const pulled = (await work.boundingBox())!
    expect(pulled.width).toBe(360)
    expect(pulled.x + pulled.width).toBe(east)
    await drag(page, work.locator('[data-edge="n"]'), 0, 3000, { x: 40, y: 1 })
    await page.mouse.up()
    expect((await work.boundingBox())!.height).toBe(200)

    // However far it is dragged, 80 px of it stay on the desk, and its bar under the top.
    for (const far of [3000, -3000]) {
      await drag(page, bar, far, far, { x: 40, y: 8 })
      const dragged = (await work.boundingBox())!
      await page.mouse.up()
      const box = (await work.boundingBox())!
      expect(box).toEqual(dragged)
      expect(box.x).toBeLessThanOrEqual(desk.x + desk.width - 80)
      expect(box.x + box.width).toBeGreaterThanOrEqual(desk.x + 80)
      expect(box.y).toBeGreaterThanOrEqual(desk.y)
      expect(box.y).toBeLessThanOrEqual(desk.y + desk.height - 80)
    }
  })

  test('opens inside the desk at its stored size at most, and is clamped when the desk shrinks', async ({
    page,
  }) => {
    const inside = async () => {
      const [box, desk] = [(await window(page).boundingBox())!, await ground(page)]
      return (
        box.x >= desk.x &&
        box.y >= desk.y &&
        box.x + box.width <= desk.x + desk.width &&
        box.y + box.height <= desk.y + desk.height
      )
    }
    expect(await window(page).boundingBox()).toMatchObject({ width: 720, height: 480 })
    expect(await inside()).toBe(true)

    // Its style narrows it at once and the manager moves it in after, so both are asked of the same moment.
    const placed = async () => [(await window(page).boundingBox())!.width, await inside()]
    await page.setViewportSize({ width: 640, height: 400 })
    await expect.poll(placed).toEqual([640, true])

    await page.setViewportSize(screen)
    await expect.poll(placed).toEqual([720, true])
  })

  test('opens one window at a time when that is set: the one before closes, and nothing drags', async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.setItem('single', 'on'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Grow' }).click()
    await expect(page.locator('article')).toHaveCount(1)
    const grow = window(page, 'Grow')
    await expect(grow.getByRole('heading')).toHaveText('Grow')
    await expect(page.locator('footer[data-for="desk"] button')).toHaveText(['grow.case'])

    const box = await grow.boundingBox()
    await drag(page, grow.locator('.window__bar'), 100, 100, { x: 200, y: 8 })
    await page.mouse.up()
    expect(await grow.boundingBox()).toEqual(box)
    await expect(grow.locator('.window__grip, .window__edge')).toHaveCount(0)
    await expect(grow.locator('.window__bar')).not.toHaveAttribute('tabindex')
  })

  test('is not modal: focus brings a window to the front, a new window takes it at its heading, and the first link skips to the front window', async ({
    page,
  }) => {
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to the window in front' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(window(page)).toBeFocused()
    await expect(page).toHaveURL('/work')

    await page.getByRole('link', { name: 'Grow' }).press('Enter')
    await expect(window(page, 'Grow').getByRole('heading')).toBeFocused()
    await expect(window(page, 'Grow')).toHaveAttribute('data-front')

    // Nothing holds the focus in the window in front: what lies behind takes it, and comes forward.
    await window(page).locator('.window__bar').focus()
    await expect(window(page)).toHaveAttribute('data-front')
    await expect(page).toHaveURL('/work')
    await expect(page.locator('main [inert]')).toHaveCount(0)

    // The controls are buttons in a named group, full screen a toggle; the bar holds no other action.
    const controls = window(page)
      .getByRole('group', { name: 'Window', exact: true })
      .getByRole('button')
    await expect(controls).toHaveCount(3)
    await expect(window(page).locator('.window__bar').locator('a, button')).toHaveCount(6)
    const full = control(window(page), 'Full screen')
    await expect(full).toHaveAttribute('aria-pressed', 'false')
    await full.click()
    await expect(full).toHaveAttribute('aria-pressed', 'true')
    // What a window in full screen covers cannot be reached.
    await expect(page.locator('nav.apps')).toHaveAttribute('inert')
    await expect(window(page, 'Grow')).toHaveAttribute('inert')
  })

  test('brings each taskbar button in at its own place as its window opens', async ({ page }) => {
    await watch(page, 'footer[data-for="desk"] button:nth-of-type(2)')
    await page.getByRole('link', { name: 'Grow' }).click()
    await expect(page.locator('footer[data-for="desk"] button')).toHaveText(['work', 'grow.case'])
    await expect(page.locator('footer[data-for="desk"] button').nth(1)).toHaveCSS('opacity', '1')
    const frames = first(await seen(page))
    expect(frames.some(({ opacity }) => opacity < 1)).toBe(true)
    expect(Math.min(...frames.map(({ scale }) => scale))).toBeGreaterThanOrEqual(0.96)
  })
})

test.describe('Window with a view that cannot be rendered', () => {
  // The error is the test's own: the page is expected to report it.
  test.use({ pageErrors: async ({}, run) => run() })

  test('keeps a render error in its own window, and leaves the others standing', async ({
    page,
  }) => {
    await page.setViewportSize(screen)
    await page.route('**/view/en/work/grow', async (route) => {
      const view = await (await route.fetch()).json()
      view.window.sections = [{ type: 'list', items: null }]
      await route.fulfill({ json: view })
    })
    await page.goto('/work', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Grow' }).click()

    const [work, grow] = ['Work', 'Grow'].map((name) =>
      page.locator(`article[aria-label="${name}"]`),
    )
    await expect(grow).toContainText('This window did not open. Close it and open it again.')
    await expect(work.getByRole('heading')).toHaveText('Work')
    await expect(work.getByRole('link', { name: 'Grow' })).toBeVisible()

    // Both still answer: the broken one closes, the other comes forward.
    await control(grow, 'Close').click()
    await expect(grow).toHaveCount(0)
    await expect(work).toHaveAttribute('data-front')
  })
})

test.describe('Window without script', () => {
  test.use({ javaScriptEnabled: false })

  test('floats in the middle of the desk at its size', async ({ page }) => {
    await page.setViewportSize(screen)
    await page.goto('/work')
    const [box, desk] = [
      (await page.locator('article').boundingBox())!,
      (await page.locator('main').boundingBox())!,
    ]

    expect(box).toMatchObject({ width: 720, height: 480 })
    expect(box.x - desk.x).toBe(desk.x + desk.width - box.x - box.width)
    expect(box.y - desk.y).toBe(desk.y + desk.height - box.y - box.height)
  })
})
