import type { Locator, Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'

// A phone, as its own browser opens the page.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

// One frame of a drawer: where its top and its sides stand, how far it is moved, its scale and its strength.
type Seen = {
  top: number
  left: number
  width: number
  y: number
  scale: number
  opacity: number
}

// Every frame, how the parts under a selector stand, from before whatever is done next.
const watch = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    const seen: Seen[][] = []
    Object.assign(window, { seen })
    requestAnimationFrame(function look() {
      seen.push(
        [...document.querySelectorAll(selector)].map((part) => {
          const style = getComputedStyle(part)
          const { top, left, width } = part.getBoundingClientRect()
          const { a, f } = new DOMMatrix(style.transform)
          return { top, left, width, y: f, scale: a, opacity: +style.opacity }
        }),
      )
      requestAnimationFrame(look)
    })
  }, selector)
const seen = (page: Page) =>
  page.evaluate(() => (Reflect.get(window, 'seen') as Seen[][]).splice(0))

const drawer = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
// A drawer has arrived once nothing moves it any more, and the one behind has stepped back.
const settled = async (part: Locator, x = 0) => {
  const origin = part.locator('.window__origin')
  await expect
    .poll(() => origin.evaluate((part) => getComputedStyle(part).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  await expect.poll(async () => (await part.locator('.window__frame').boundingBox())!.x).toBe(x)
}
const top = async (part: Locator) => (await part.locator('.window__origin').boundingBox())!.y
const bottom = async (page: Page) => {
  const room = (await page.locator('.screen__main').boundingBox())!
  return room.y + room.height
}
// The handle is held at its middle and moved down in steps, one frame apart, or at once for a flick.
async function pull(page: Page, part: Locator, dy: number, steps: number, wait = 20) {
  const handle = (await part.locator('.drawer__handle').boundingBox())!
  const [x, y] = [handle.x + handle.width / 2, handle.y + handle.height / 2]
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(x, y + (dy * step) / steps)
    if (wait) await page.waitForTimeout(wait)
  }
}

test.describe('Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await emptyDesk(page)
    await page.goto('/', { waitUntil: 'networkidle' })
  })

  test('rises from the bottom edge over slow, not from its opener, and the one behind steps back at the same time', async ({
    page,
  }) => {
    await watch(page, 'article .window__origin')
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await settled(work)
    const rest = await top(work)
    const rising = (await seen(page)).flatMap((parts) => parts.slice(0, 1))
    // It starts with its top at the bottom edge, as wide as the screen, and rises without growing or overshooting.
    expect(rising[0].top).toBeGreaterThanOrEqual((await bottom(page)) - 1)
    expect(
      rising.every(({ left, width, scale }) => left === 0 && width === 390 && scale === 1),
    ).toBe(true)
    expect(rising.some(({ top }) => top > rest + 1 && top < rising[0].top - 1)).toBe(true)
    expect(Math.min(...rising.map(({ top }) => top))).toBeGreaterThanOrEqual(rest - 0.5)
    expect(rising.at(-1)!.top).toBeCloseTo(rest, 0)

    await watch(page, 'article .window__frame')
    await page.keyboard.press('s')
    const services = drawer(page, 'Services')
    await settled(services)
    await settled(work, 8)
    const frames = (await seen(page)).filter((parts) => parts.length === 2)
    // While the new one rises, the first comes 8 px in at each side and 8 px up, under the scrim.
    const both = frames.filter(
      ([behind, front]) =>
        behind.left > 0 && behind.left < 8 && front.top > frames.at(-1)![1].top + 1,
    )
    expect(both.length).toBeGreaterThan(0)
    expect(frames.at(-1)![0]).toMatchObject({ left: 8, width: 374 })
    // A drawer as high as the room keeps its top at the menu bar.
    const room = (await page.locator('.screen__main').boundingBox())!.y
    expect(frames.at(-1)![0].top).toBeCloseTo(Math.max(rest - 8, room), 0)
    await expect(work).toHaveAttribute('data-back', '1')
    await expect(work).toHaveAttribute('inert')
  })

  test('has no close button: its handle is the way out, a finger high about the bar it shows', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await settled(work)
    await expect(work.getByRole('button', { name: 'Close' })).toHaveCount(1)
    await expect(work.locator('.wctl:visible')).toHaveCount(0)

    const handle = work.locator('.drawer__handle')
    const box = (await handle.boundingBox())!
    expect(box.height).toBe(16)
    await expect(handle).toHaveCSS('touch-action', 'none')
    const hit = (dy: number) =>
      page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.className,
        [box.x + box.width / 2, box.y + box.height / 2 + dy],
      )
    // Above, as far as the menu bar, which stays over a drawer that reaches it.
    const room = (await page.locator('.screen__main').boundingBox())!.y
    expect(await hit(-Math.min(23, box.y + box.height / 2 - room - 1))).toBe('drawer__handle')
    expect(await hit(23)).toBe('drawer__handle')
    expect(await hit(26)).not.toBe('drawer__handle')

    // Pressed, it puts the drawer away, closed, and its app opens it again.
    await handle.click()
    await expect(work).toHaveCount(0)
    await expect(page).toHaveURL('/')
    await page.getByRole('link', { name: 'Work' }).click()
    await expect(work).toHaveAttribute('data-front')
    await expect(page).toHaveURL('/work')
  })

  test('follows the finger, springs back when let go too soon, and goes when dragged past half or flicked', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await settled(work)
    const rest = await top(work)
    const height = (await work.locator('.window__origin').boundingBox())!.height

    // Held and moved, it is where the finger is, and never above its place.
    await pull(page, work, 60, 6)
    expect(await top(work)).toBeCloseTo(rest + 60, 0)
    await page.mouse.move(195, 0, { steps: 4 })
    expect(await top(work)).toBeCloseTo(rest, 0)
    await page.mouse.move(195, rest + 8 + 60, { steps: 4 })
    // Let go after a rest, short of half its height, it springs back.
    await page.waitForTimeout(200)
    await page.mouse.up()
    await expect.poll(() => top(work)).toBeCloseTo(rest, 0)
    await expect(work).toHaveAttribute('data-front')

    await pull(page, work, height / 2 + 8, 8)
    await page.waitForTimeout(200)
    await page.mouse.up()
    await expect(work).toBeHidden()
    await expect(page).toHaveURL('/')

    await page.getByRole('link', { name: 'Work' }).click()
    await settled(work)
    // A flick a fraction of its height long puts it away too, from where the finger left it.
    await watch(page, 'article .window__origin')
    await pull(page, work, 48, 3, 0)
    await page.mouse.up()
    await expect(work).toBeHidden()
    const sinking = (await seen(page)).flatMap((parts) => parts).filter(({ width }) => width > 0)
    expect(sinking.some(({ top }) => top > rest + 48 + 1)).toBe(true)
    expect(sinking.every(({ opacity }) => opacity === 1)).toBe(true)
  })

  test('goes at a press of Enter on its handle after a drag the browser made no click of', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await settled(work)
    const handle = work.locator('.drawer__handle')

    // A touch drag let go short of half springs back, and a touch drag ends in no click.
    await handle.evaluate((handle) => {
      const { x, y } = handle.getBoundingClientRect()
      const send = (type: string, dy: number) =>
        handle.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            button: 0,
            pointerId: 1,
            clientX: x + 10,
            clientY: y + 10 + dy,
          }),
        )
      send('pointerdown', 0)
      send('pointermove', 30)
      send('pointerup', 30)
    })
    await settled(work)
    await handle.focus()
    await page.keyboard.press('Enter')
    await expect(work).toBeHidden()
  })

  test('is modal: the focus moves in and stays in, what is behind is inert, Esc closes it, and the focus returns to its opener', async ({
    page,
  }) => {
    const app = page.getByRole('link', { name: 'Work' })
    await app.click()
    const work = page.locator('#window-work')
    await expect(work.getByRole('heading', { name: 'Work' })).toBeFocused()
    await expect(work.getByRole('dialog', { name: 'Work' })).toHaveAttribute('aria-modal', 'true')
    await expect(page.locator('nav.apps')).toHaveAttribute('inert')
    await expect(page.locator('header')).not.toHaveAttribute('inert')

    // Round and round, both ways, the focus stays in the drawer.
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let press = 0; press < 5; press++) {
        await page.keyboard.press(key)
        expect(await work.evaluate((work) => work.contains(document.activeElement))).toBe(true)
      }
    }

    // An item opened from its list shows in the same drawer, which takes the focus at its heading.
    await work.getByRole('link', { name: 'Grow' }).press('Enter')
    await expect(work.getByRole('heading', { name: 'Grow' })).toBeFocused()
    await expect(page).toHaveURL('/work/grow')
    await expect(page.locator('article')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(work).toBeHidden()
    await expect(app).toBeFocused()
    await expect(page.locator('main [inert], footer[inert]')).toHaveCount(0)
    await expect(page.locator('nav.apps')).not.toHaveAttribute('inert')
  })

  test('stands three deep at most, and a press on the scrim puts the one in front away', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Work' }).click()
    // Each key opens its window as a drawer in front of the last, once that one has taken the focus.
    for (const [name, key] of [
      ['Work', 's'],
      ['Services', 'c'],
      ['CV', 'k'],
    ]) {
      await expect(drawer(page, name).getByRole('heading', { level: 1 })).toBeFocused()
      await page.keyboard.press(key)
    }
    const [work, services, cv, contact] = ['Work', 'Services', 'CV', 'Contact'].map((name) =>
      drawer(page, name),
    )
    await expect(contact).toHaveAttribute('data-front')
    await expect(work).toBeHidden()
    await expect(services).toHaveAttribute('data-back', '2')
    await expect(cv).toHaveAttribute('data-back', '1')
    await settled(contact)
    await settled(cv, 8)
    await settled(services, 16)
    const frame = (part: Locator) => part.locator('.window__frame').boundingBox()
    expect(await frame(services)).toMatchObject({ x: 16, width: 358 })
    expect(await frame(cv)).toMatchObject({ x: 8, width: 374 })
    // One scrim, the front drawer's, lies over the desk and the drawers behind.
    await expect(contact.locator('.window__scrim')).toBeVisible()
    await expect(cv.locator('.window__scrim')).toBeHidden()
    await expect(services.locator('.window__scrim')).toBeHidden()

    // A drawer as high as the room leaves no scrim to press above it, so the press is sent to the scrim.
    await contact.locator('.window__scrim').dispatchEvent('click')
    await expect(contact).toBeHidden()
    await expect(cv).toHaveAttribute('data-front')
    await expect(work).toHaveAttribute('data-back', '2')
    await expect(page).toHaveURL('/cv')
  })

  test('leaves over three quarters of slow, its scrim with it, and the one behind comes forward at once', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await expect(work.getByRole('heading', { level: 1 })).toBeFocused()
    await page.keyboard.press('s')
    const services = drawer(page, 'Services')
    await settled(services)
    await settled(work, 8)

    const rest = await top(services)
    await watch(page, 'article[aria-label="Services"] :is(.window__origin, .window__scrim)')
    const started = await page.evaluate(() => performance.now())
    await services.locator('.drawer__handle').click()
    await expect(work).toHaveAttribute('data-front')
    await expect(services).toHaveCount(0)
    const took = (await page.evaluate(() => performance.now())) - started
    const leaving = (await seen(page)).filter((parts) => parts.length === 2)
    // It sinks the way it came while its scrim fades, and is gone in about 240 ms.
    expect(leaving.some(([, origin]) => origin.top > rest + 1)).toBe(true)
    expect(leaving.some(([scrim]) => scrim.opacity > 0 && scrim.opacity < 1)).toBe(true)
    expect(took).toBeLessThan(800)
    await settled(work)
  })

  test('leaves nothing at the foot of the screen, and the window of the start opens again from its app, first on the desk', async ({
    page,
  }) => {
    const apps = page.getByRole('navigation', { name: 'Apps' }).getByRole('link')
    await expect(apps.first()).toHaveText('Welcome')
    await expect(page.locator('footer:visible')).toHaveCount(0)

    await apps.first().click()
    const welcome = drawer(page, 'Welcome')
    await settled(welcome)
    await expect(page).toHaveURL('/welcome')
    await welcome.locator('.drawer__handle').click()
    await expect(welcome).toHaveCount(0)
    await expect(page.locator('footer:visible')).toHaveCount(0)
    await expect(page.locator('article')).toHaveCount(0)
  })

  test('as high as the screen, ends at the menu bar', async ({ page }) => {
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await settled(work)
    // A drawer taller than the room under the menu bar.
    await work.locator('.window__body').evaluate((body) => (body.style.minHeight = '2000px'))
    const bar = (await page.locator('header').boundingBox())!
    await expect.poll(() => top(work)).toBeCloseTo(bar.y + bar.height, 0)
  })

  test('fades in place under reduced motion, and follows the finger as before', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')

    await watch(page, 'article .window__origin')
    await page.getByRole('link', { name: 'Work' }).click()
    const work = drawer(page, 'Work')
    await settled(work)
    const rest = await top(work)
    const opening = (await seen(page)).flatMap((parts) => parts).filter(({ width }) => width > 0)
    expect(opening.every(({ y }) => y === 0)).toBe(true)
    expect(opening.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true)

    // Slowly, well under a flick, so the drawer springs back when let go.
    await pull(page, work, 40, 4, 40)
    expect(await top(work)).toBeCloseTo(rest + 40, 0)
    await page.mouse.up()

    await watch(page, 'article .window__origin')
    await page.keyboard.press('Escape')
    await expect(work).toBeHidden()
    const leaving = (await seen(page)).flatMap((parts) => parts).filter(({ width }) => width > 0)
    expect(leaving.every(({ top, y }) => y === 0 && Math.abs(top - rest) < 1)).toBe(true)
    expect(leaving.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true)
  })
})

test.describe('Drawer, in the catalogue', () => {
  test.use({ viewport: { width: 1536, height: 900 }, isMobile: false, hasTouch: false })

  test('scrolls the actions at its foot with what it holds when it is short, and keeps them under the thumb when it is not', async ({
    page,
  }) => {
    await page.goto('/catalogue/shell', { waitUntil: 'networkidle' })
    const phone = page.locator('.screen:has(article .btngroup)').first()
    const main = phone.locator('.window__main')
    const foot = phone.locator('article .btngroup')
    const sized = (height: number, rows: number) =>
      phone.evaluate(
        (screen, [height, rows]) => {
          screen.style.height = `${height}px`
          const row = screen.querySelector('article .row')!
          for (let at = 0; at < rows; at++) row.after(row.cloneNode(true))
        },
        [height, rows],
      )
    const at = async () => (await foot.boundingBox())!.y

    // Short: the foot is at the end of what scrolls.
    await sized(400, 0)
    const end = await at()
    expect(await main.evaluate((main) => main.scrollHeight > main.clientHeight)).toBe(true)
    await main.evaluate((main) => (main.scrollTop = main.scrollHeight))
    expect(await at()).toBeLessThan(end)

    // Tall: the body scrolls above the foot, which stays at the foot of the drawer.
    await sized(900, 20)
    const pinned = await at()
    const body = phone.locator('.window__body')
    expect(await body.evaluate((body) => body.scrollHeight > body.clientHeight)).toBe(true)
    await body.evaluate((body) => (body.scrollTop = body.scrollHeight))
    expect(await at()).toBe(pinned)
    const frame = (await phone.locator('article .window__frame').boundingBox())!
    const box = (await foot.boundingBox())!
    expect(frame.y + frame.height - box.y - box.height).toBe(24)
  })
})
