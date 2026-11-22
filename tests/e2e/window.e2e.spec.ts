import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'
import { travelled } from './travels'

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

const near = (one: { x: number; y: number; width: number; height: number }, other: typeof one) => {
  for (const side of ['x', 'y', 'width', 'height'] as const)
    expect(Math.abs(one[side] - other[side]), side).toBeLessThanOrEqual(1)
}
const control = (window: Locator, name: string) => window.getByRole('button', { name })
// A shortcut on the desk, apart from the links inside the windows.
const app = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Apps' }).getByRole('link', { name })
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

  test('travels as one box from the tile of its app to its place, what it holds unseen until it lands, and back to the tile as it closes', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    const tile = desk.getByRole('link', { name: 'one' }).locator('.app__tile')
    const from = (await tile.boundingBox())!
    await watch(page, '#window-one .window__content')
    const way = await travelled(page, window, () => open('one'))
    expect(way.most).toBe(1)
    near(way.boxes[0], from)
    // What it holds keeps the size it lands at, and is not seen until three quarters of the way.
    const place = (await window.boundingBox())!
    const held = first(await seen(page)).slice(0, way.boxes.length)
    expect(held.every(({ width }) => Math.abs(width - place.width) <= 1)).toBe(true)
    expect(held.slice(0, Math.floor(held.length / 2)).every(({ opacity }) => opacity === 0)).toBe(
      true,
    )
    await expect(window.locator('.window__content')).toHaveCSS('opacity', '1')

    await travelled(page, tile, () => control(window, 'Close').click())
    await expect(window).toHaveCount(0)
    await expect(desk.locator('footer button')).toHaveCount(0)

    // With no opener on screen it travels from just under its size at its own place.
    const other = page.locator('#window-other')
    const own = await travelled(page, other, () =>
      page.getByRole('button', { name: 'Open with no opener' }).click(),
    )
    expect(own.boxes[0].width / (await other.boundingBox())!.width).toBeCloseTo(0.96, 2)
  })

  test('minimises to where its taskbar button stands, whose mark turns hollow, and comes back from it', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    const button = desk.locator('footer button')
    await open('one')
    await expect(window.locator('.window__content')).toHaveCSS('opacity', '1')
    await expect(button.locator('.mark')).toHaveCSS('transition-delay', '0s')

    await travelled(page, button, () => control(window, 'Minimise').click())
    await expect(window).toBeHidden()
    await expect(button).toHaveText('one')
    await expect(button.locator('.mark')).toHaveAttribute('data-tone', 'off')
    await expect(button.locator('.mark')).toHaveCSS('transition-delay', '0.32s')

    // Its button brings it back out of the taskbar.
    const at = (await button.boundingBox())!
    const back = await travelled(page, window, () => button.click())
    near(back.boxes[0], at)
  })

  test('goes to full screen as one frame that travels to the desk while its content fades out and back in', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    await open('one')
    await expect(window.locator('.window__content')).toHaveCSS('opacity', '1')
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

  test('comes to the front without travelling: the name and the filled controls fade in, and no bar carries dots', async ({
    page,
  }) => {
    await open('one')
    await open('two')
    const [behind, front] = [page.locator('#window-one'), page.locator('#window-two')]
    await expect(front.locator('.window__content')).toHaveCSS('opacity', '1')
    await expect(behind).not.toHaveAttribute('data-front')
    await expect(page.locator('.window__bar .dotted')).toHaveCount(0)
    const quiet = await behind
      .locator('.path__here')
      .evaluate((here) => getComputedStyle(here).color)
    const boxes = [await behind.boundingBox(), await front.boundingBox()]

    await behind.locator('.window__bar').click({ position: { x: 16, y: 16 } })
    await expect(behind).toHaveAttribute('data-front')
    await expect(front).not.toHaveAttribute('data-front')
    await expect(behind.locator('.path__here')).toHaveCSS('transition-duration', '0.16s')
    await expect(behind.locator('.path__here')).not.toHaveCSS('color', quiet)
    await expect(front.locator('.path__here')).toHaveCSS('color', quiet)
    await expect(behind.locator('.window__bar')).toHaveCSS('cursor', 'grab')
    expect([await behind.boundingBox(), await front.boundingBox()]).toEqual(boxes)
    expect(await behind.evaluate((window) => Number(getComputedStyle(window).zIndex))).toBe(2)
  })

  test('keeps a long name clear of the controls by the handle', async ({ page }) => {
    await open('one')
    const bar = page.locator('#window-one .window__bar')
    await bar.locator('.path__here').evaluate((here) => (here.textContent = 'name'.repeat(80)))
    // Layout boxes, so the window's opening scale does not count.
    const [text, handle, after] = await bar.evaluate((bar) => {
      const handle = bar.querySelector<HTMLElement>('.bar__handle')!
      return [handle.previousElementSibling, handle, handle.nextElementSibling].map((part) => {
        const { offsetLeft, offsetWidth } = part as HTMLElement
        return { left: offsetLeft, right: offsetLeft + offsetWidth, width: offsetWidth }
      })
    })
    expect(handle.width).toBeGreaterThanOrEqual(12)
    expect(handle.left - text.right).toBeGreaterThanOrEqual(12)
    expect(after.left - handle.right).toBeGreaterThanOrEqual(12)
  })

  test('follows the pointer exactly when dragged, and resizes in steps of 8 with its real size shown', async ({
    page,
  }) => {
    const window = page.locator('#window-one')
    await open('one')
    await expect(window.locator('.window__content')).toHaveCSS('opacity', '1')
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

  test('replaces its content: the old leaves together, then the title is decoded in place and the rest rises in turn', async ({
    page,
  }) => {
    const specimen = page.locator('article', { has: page.getByRole('button', { name: 'Next' }) })
    await specimen.scrollIntoViewIfNeeded()
    const views = specimen.locator('.window__view')
    await specimen.evaluate((window) => window.setAttribute('data-watched', ''))
    // Every frame, the box of the new title, what stands over it, and the box, strength and rise of the text under it.
    await page.evaluate(() => {
      const looks: { title: number[]; shown: string | null; text: number[] }[] = []
      Object.assign(window, { looks })
      requestAnimationFrame(function look() {
        const view = [...document.querySelectorAll('[data-watched] .window__view')].at(-1)
        const title = view?.querySelector('h2')
        const text = view?.querySelector<HTMLElement>('.hgroup__text')
        if (title && text) {
          const { width, height } = title.getBoundingClientRect()
          const style = getComputedStyle(text)
          looks.push({
            title: [width, height],
            shown: title.querySelector('[aria-hidden="true"]')?.textContent ?? null,
            text: [text.offsetTop, Number(style.opacity), new DOMMatrix(style.transform).f],
          })
        }
        requestAnimationFrame(look)
      })
    })
    await watch(page, '[data-watched] .window__view')

    await specimen.getByRole('button', { name: 'Next' }).click()
    await expect(views).toHaveCount(1)
    await expect(specimen.getByRole('heading', { level: 2 })).toHaveAccessibleName('Second')
    await expect(specimen.locator('[data-decode], [data-enter]')).toHaveCount(0)

    // The old only fades, gone within a few frames; the new view itself stands still.
    const frames = (await seen(page)).filter((parts) => parts.length === 2)
    expect(frames.length).toBeLessThan(12)
    expect(first(frames, 0).every(({ x }) => x === 0)).toBe(true)
    expect(first(frames, 0).at(-1)!.opacity).toBeLessThan(first(frames, 0)[0].opacity)
    expect(first(frames, 1).every(({ x, opacity }) => x === 0 && opacity === 1)).toBe(true)

    const looks = await page.evaluate(() =>
      (Reflect.get(window, 'looks') as { title: number[]; shown: string | null; text: number[] }[])
        .splice(0)
        .filter(({ title }) => title[0]),
    )
    const [last] = looks.slice(-1)
    // The title is decoded from its start, a run of its own letters ahead, while its box keeps its size and the text
    // under it keeps its place.
    const shown = looks.map(({ shown }) => shown).filter(Boolean) as string[]
    expect(shown.length).toBeGreaterThan(0)
    for (const text of shown) {
      expect(text.length).toBeLessThanOrEqual(6)
      expect([...text].every((letter) => 'Second'.includes(letter))).toBe(true)
    }
    expect(looks.every(({ title }) => title.join() === last.title.join())).toBe(true)
    expect(looks.every(({ text }) => text[0] === last.text[0])).toBe(true)
    // The text rises 8 px as it fades in.
    expect(looks.some(({ text: [, opacity, y] }) => opacity > 0 && opacity < 1 && y > 0)).toBe(true)
    expect(Math.max(...looks.map(({ text }) => text[2]))).toBeLessThanOrEqual(8)
    expect(last.text.slice(1)).toEqual([1, 0])
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
    const part = window.locator('.window__frame')

    await watch(page, '#window-one .window__frame')
    await open('one')
    await expect(part).toHaveCSS('opacity', '1')
    await control(window, 'Minimise').click()
    await expect(window).toBeHidden()
    await desk.locator('footer button').click()
    await expect(part).toHaveCSS('opacity', '1')
    // It fades where it stands, and nothing travels or changes size.
    const moved = first(await seen(page)).filter(({ width }) => width > 0)
    expect(moved.every(({ scale, width }) => scale === 1 && width === moved[0].width)).toBe(true)
    expect(moved.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true)
    await expect(page.locator('[data-travels]')).toHaveCount(0)

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
    await app(page, 'Services').click()
    await expect(page.locator('article')).toHaveCount(1)
    const services = window(page, 'Services')
    await expect(services.getByRole('heading')).toHaveText('Services')
    await expect(page.locator('footer[data-for="desk"] button')).toHaveText(['services'])

    const box = await services.boundingBox()
    await drag(page, services.locator('.window__bar'), 100, 100, { x: 200, y: 8 })
    await page.mouse.up()
    expect(await services.boundingBox()).toEqual(box)
    await expect(services.locator('.window__grip, .window__edge')).toHaveCount(0)
    await expect(services.locator('.window__bar')).not.toHaveAttribute('tabindex')
  })

  test('switched on from Accessibility, one window at a time leaves that window alone, and stays so after a reload', async ({
    page,
  }) => {
    await app(page, 'Services').click()
    await expect(window(page, 'Services').getByRole('heading')).toHaveText('Services')
    await page.goto('/accessibility', { waitUntil: 'networkidle' })
    await expect(page.locator('article')).toHaveCount(3)

    await window(page, 'Accessibility')
      .getByRole('switch', { name: /^One window at a time/ })
      .click()
    await expect(page.locator('article')).toHaveCount(1)
    await expect(window(page, 'Accessibility')).toBeVisible()
    await expect(page.locator('footer[data-for="desk"] button')).toHaveCount(1)

    await app(page, 'Services').click()
    await expect(page.locator('article')).toHaveCount(1)
    await expect(window(page, 'Services').getByRole('heading')).toHaveText('Services')

    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('article')).toHaveCount(1)
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

    await app(page, 'Services').press('Enter')
    await expect(window(page, 'Services').getByRole('heading')).toBeFocused()
    await expect(window(page, 'Services')).toHaveAttribute('data-front')

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
    await expect(window(page, 'Services')).toHaveAttribute('inert')
  })

  test('raises each taskbar button into the taskbar as its window sets off', async ({ page }) => {
    await watch(page, 'footer[data-for="desk"] button:nth-of-type(2)')
    await app(page, 'Services').click()
    const button = page.locator('footer[data-for="desk"] button').nth(1)
    await expect(page.locator('footer[data-for="desk"] button')).toHaveText(['work', 'services'])
    await expect(button).toHaveCSS('opacity', '1')
    await expect(button).toHaveCSS('transform', 'none')
    const rest = (await button.boundingBox())!.y
    const frames = first(await seen(page))
    expect(frames.some(({ opacity, top }) => opacity < 1 && top > rest + 1)).toBe(true)
    expect(frames.every(({ scale }) => scale === 1)).toBe(true)
  })
})

test.describe('Window with a view that cannot be rendered', () => {
  // The error is the test's own: the page is expected to report it.
  test.use({ pageErrors: async ({}, run) => run() })

  test('keeps a render error in its own window, and leaves the others standing', async ({
    page,
  }) => {
    await page.setViewportSize(screen)
    await page.route('**/view/en/services', async (route) => {
      const view = await (await route.fetch()).json()
      view.window.sections = [{ type: 'list', items: null }]
      await route.fulfill({ json: view })
    })
    await page.goto('/work', { waitUntil: 'networkidle' })
    await app(page, 'Services').click()

    const [work, services] = ['Work', 'Services'].map((name) =>
      page.locator(`article[aria-label="${name}"]`),
    )
    await expect(services).toContainText('This window did not open. Close it and open it again.')
    await expect(work.getByRole('heading')).toHaveText('Work')
    await expect(work.getByRole('link', { name: 'Grow' })).toBeVisible()

    // Both still answer: the broken one closes, the other comes forward.
    await control(services, 'Close').click()
    await expect(services).toHaveCount(0)
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

test.describe('What a window holds', () => {
  // Every frame, how far the window opening has come, and whether any of what it holds is arriving or waiting, and
  // whether what waits is seen.
  const arrivals = (page: Page, window: string) =>
    page.evaluate((window) => {
      const frames: {
        scale: number
        y: number
        travels: boolean
        waiting: boolean
        shown: boolean
        arriving: boolean
      }[] = []
      Object.assign(globalThis, { looked: frames })
      requestAnimationFrame(function look() {
        const origin = document.querySelector(`${window} .window__origin`)
        if (origin) {
          const { a, f } = new DOMMatrix(getComputedStyle(origin).transform)
          const waits = [...origin.querySelectorAll('[data-enter="wait"]')]
          frames.push({
            scale: a,
            y: f,
            travels: !!origin.querySelector('[data-travels]'),
            waiting: waits.length > 0,
            shown: waits.some((part) => getComputedStyle(part).opacity !== '0'),
            arriving: !!origin.querySelector(
              '[data-enter="in"], [data-decode] > [aria-hidden]:not(:empty)',
            ),
          })
        }
        requestAnimationFrame(look)
      })
    }, window)
  const frames = (page: Page) =>
    page.evaluate(
      () =>
        Reflect.get(globalThis, 'looked') as {
          scale: number
          y: number
          travels: boolean
          waiting: boolean
          shown: boolean
          arriving: boolean
        }[],
    )

  for (const [device, size] of [
    ['a desk', { width: 1440, height: 900 }],
    ['a phone', { width: 390, height: 844 }],
  ] as const) {
    test(`arrives once its window has opened, on ${device}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('/work', { waitUntil: 'networkidle' })
      await arrivals(page, '#window-services')
      await page.keyboard.press('s')
      const services = page.locator('#window-services')
      await expect(services.getByRole('heading', { level: 1 })).toBeVisible()
      // What lies below the fold still waits to be seen.
      await expect(services.locator('[data-enter="in"], [data-decode]')).toHaveCount(0)

      const seen = await frames(page)
      expect(seen.some(({ waiting }) => waiting)).toBe(true)
      // What waits is never seen, though a part has transitions of its own.
      expect(seen.some(({ shown }) => shown)).toBe(false)
      expect(seen.some(({ arriving }) => arriving)).toBe(true)
      // Nothing arrives while the window travels or the drawer rises.
      const opening = seen.filter(({ scale, y, travels }) => travels || scale < 0.99 || y > 1)
      expect(opening.length).toBeGreaterThan(0)
      expect(opening.every(({ arriving }) => !arriving)).toBe(true)
    })
  }

  test('settles the count beside the title in its digits alone', async ({ page }) => {
    await page.setViewportSize(screen)
    await page.goto('/work/grow', { waitUntil: 'networkidle' })
    const work = page.locator('#window-work')
    const count = work.locator('.window__content > .bar').nth(1).locator('.decipher')
    await count.locator('[aria-hidden]').evaluate((cipher) => {
      const counts: string[] = []
      Object.assign(window, { counts })
      new MutationObserver(() => counts.push(cipher.textContent!)).observe(cipher, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    })

    await work.getByRole('navigation').getByRole('link', { name: 'Field' }).click()
    await expect(count).toHaveText('02 / 03')
    const counts = await page.evaluate(() => Reflect.get(window, 'counts') as string[])
    expect(counts.length).toBeGreaterThan(0)
    // Whole throughout, only its position changing, as the total stays.
    for (const shown of counts) expect(shown).toMatch(/^(\d\d \/ 03)?$/)
    await expect(count.locator(':not([aria-hidden])')).toHaveText('02 / 03')
  })
})
