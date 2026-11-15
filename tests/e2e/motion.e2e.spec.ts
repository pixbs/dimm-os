import type { Page } from '@playwright/test'

import { expect, test } from './test'

const setting = (page: Page, name: string, value: string) =>
  page
    .locator('.doc__sets span', { hasText: name })
    .getByRole('button', { name: value, exact: true })
    .click()

// Every frame, the scale and the opacity of the part that opens and closes.
const watchPart = (page: Page) =>
  page.evaluate(() => {
    const seen: number[][] = []
    Object.assign(window, { seen })
    requestAnimationFrame(function look() {
      const part = document.querySelector('.opens__part')
      const style = part && getComputedStyle(part)
      if (style) seen.push([new DOMMatrix(style.transform).a, Number(style.opacity)])
      requestAnimationFrame(look)
    })
  })
const seen = (page: Page) =>
  page.evaluate(() => (Reflect.get(window, 'seen') as number[][]).splice(0))

// How often a canvas was drawn, counted from before the page's own script.
const countDraws = (page: Page) =>
  page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect
    Object.assign(window, { draws: 0 })
    CanvasRenderingContext2D.prototype.clearRect = function (...box) {
      Object.assign(window, { draws: 1 + Reflect.get(window, 'draws') })
      clear.apply(this, box)
    }
  })
const draws = (page: Page) => page.evaluate(() => Reflect.get(window, 'draws') as number)
// Drawn frame after frame, not once because something about it changed.
const runs = async (page: Page) => {
  const before = await draws(page)
  await page.waitForTimeout(200)
  return (await draws(page)) > before + 4
}
const stir = async (page: Page) => {
  const box = (await page.locator('canvas').first().boundingBox())!
  await page.mouse.move(box.x + 60, box.y + 60)
  await page.mouse.move(box.x + 140, box.y + 140, { steps: 8 })
}

test.describe('Motion', () => {
  test.beforeEach(async ({ page }) => {
    await countDraws(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/catalogue/motion', { waitUntil: 'networkidle' })
  })

  test('times CSS and Motion from the same tokens, an exit in half its entrance', async ({
    page,
  }) => {
    const link = page.getByRole('link', { name: 'Atoms / Type' })
    await expect(link).toHaveCSS('transition-property', 'color')
    await expect(link).toHaveCSS('transition-duration', '0.16s')
    await expect(link).toHaveCSS('transition-timing-function', 'cubic-bezier(0.2, 0, 0, 1)')
    // The rows of slow and of slow-exit.
    const runs = page.locator('.run > :first-child')
    await expect(runs.nth(1)).toHaveCSS('transition-duration', '0.32s')
    await expect(runs.nth(4)).toHaveCSS('transition-duration', '0.16s')

    const timing = () =>
      page.locator('.opens__part').evaluate((part) => {
        const timing = part.getAnimations()[0]?.effect?.getTiming()
        return [timing?.duration, timing?.easing]
      })
    await page.getByRole('button', { name: 'From its opener, slow' }).click()
    await expect.poll(timing).toEqual([320, 'cubic-bezier(0, 0, 0, 1)'])
    await expect(page.locator('.opens__part')).toHaveCSS('opacity', '1')
    await page.getByRole('button', { name: 'From its opener, slow' }).click()
    await expect.poll(timing).toEqual([160, 'cubic-bezier(0.3, 0, 1, 1)'])
  })

  test('opens a part out of the centre of its opener and closes it back, or from 96% at its own place', async ({
    page,
  }) => {
    const part = page.locator('.opens__part')
    const opener = page.getByRole('button', { name: 'From its opener, fast' })
    await watchPart(page)

    await opener.click()
    await expect(part).toHaveCSS('opacity', '1')
    expect(Math.min(...(await seen(page)).map(([scale]) => scale))).toBeLessThan(0.5)
    const box = (await opener.boundingBox())!
    const origin = await part.evaluate((part) => {
      const { left, top } = part.getBoundingClientRect()
      const [x, y] = getComputedStyle(part).transformOrigin.split(' ').map(parseFloat)
      return [left + x, top + y]
    })
    expect(origin[0]).toBeCloseTo(box.x + box.width / 2, 0)
    expect(origin[1]).toBeCloseTo(box.y + box.height / 2, 0)

    await opener.click()
    await expect(part).toHaveCount(0)
    expect((await seen(page)).at(-1)![0]).toBeLessThan(0.5)

    await page.getByRole('button', { name: 'With no opener on screen' }).click()
    await expect(part).toHaveCSS('opacity', '1')
    const scales = (await seen(page)).map(([scale]) => scale)
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.96)
    expect(Math.min(...scales)).toBeLessThan(1)
    await expect(part).toHaveCSS('transform-origin', /^160px /)
  })

  test('deciphers mono text when it changes, and keeps the real text in the page', async ({
    page,
  }) => {
    const cipher = page.locator('.decipher > [aria-hidden]')
    const real = page.locator('.decipher > :not([aria-hidden])')
    // Every text the cipher shows, with the moment it showed it.
    await cipher.evaluate((cipher) => {
      const shown: [string, number][] = []
      Object.assign(window, { shown })
      new MutationObserver(() => shown.push([cipher.textContent, performance.now()])).observe(
        cipher,
        { childList: true, characterData: true, subtree: true },
      )
    })
    const shown = () =>
      page.evaluate(() => (Reflect.get(window, 'shown') as [string, number][]).splice(0))

    // What the server painted did not animate in.
    await expect(real).toHaveText('system/says · 12 items · 2026-11-10')
    await expect(cipher).toBeEmpty()
    expect(await shown()).toEqual([])

    const text = 'work/grow.case · 3 of 12 · ⌘K'
    await page.getByRole('button', { name: 'Change' }).click()
    await expect(real).toHaveText(text)
    await expect(real).toHaveCSS('clip-path', 'inset(100%)')
    await expect(cipher).toBeEmpty()
    await expect(real).toHaveCSS('clip-path', 'none')

    const ciphers = await shown()
    const letters = ciphers.slice(0, -1).map(([letters]) => [...letters])
    expect(letters.length).toBeGreaterThan(3)
    // Its own characters only, the spaces in place, and the start locked before the end.
    for (const cipher of letters) {
      expect(cipher.length).toBe([...text].length)
      expect(
        cipher.every(
          (letter, at) => text.includes(letter) && (letter === ' ') === (text[at] === ' '),
        ),
      ).toBe(true)
    }
    expect(letters.at(-1)!.slice(0, 12).join('')).toBe(text.slice(0, 12))
    expect(letters[0].join('')).not.toBe(text)
    expect(ciphers.at(-1)![1] - ciphers[0][1]).toBeLessThan(320 + 200)

    // With reduced motion the final text is there at once.
    await setting(page, 'motion', 'reduce')
    await page.getByRole('button', { name: 'Change' }).click()
    await expect(real).toHaveText('system/says · 12 items · 2026-11-10')
    await page.waitForTimeout(400)
    expect(await shown()).toEqual([])
  })

  test('fades in place with reduced motion, and changes colour only', async ({ page }) => {
    await setting(page, 'motion', 'reduce')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')

    const fades =
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, box-shadow, opacity'
    await expect(page.locator('.run > :first-child').first()).toHaveCSS(
      'transition-property',
      fades,
    )
    await expect(page.getByRole('link', { name: 'Atoms / Type' })).toHaveCSS(
      'transition-property',
      fades,
    )

    await watchPart(page)
    const opener = page.getByRole('button', { name: 'From its opener, slow' })
    await opener.click()
    await expect(page.locator('.opens__part')).toHaveCSS('opacity', '1')
    await opener.click()
    await expect(page.locator('.opens__part')).toHaveCount(0)
    const part = await seen(page)
    expect(part.every(([scale]) => scale === 1)).toBe(true)
    expect(part.some(([, opacity]) => opacity > 0 && opacity < 1)).toBe(true)

    // What comes as many comes at once, and what travels fades out here and in there.
    await page.getByRole('button', { name: 'Play' }).nth(2).click()
    await expect(page.locator('.sweep > *').last()).toHaveCSS('transition-delay', '0s')
    await page.getByRole('button', { name: 'Play' }).nth(3).click()
    const dots = page.locator('.played').nth(3).locator('.run > *')
    await expect(dots.first()).toHaveCSS('opacity', '0')
    await expect(dots.first()).toHaveCSS('transform', 'none')
    await expect(dots.last()).toHaveCSS('opacity', '1')
  })

  test('runs no canvas while the tab is hidden, the picture is off screen or covered, or under either setting', async ({
    page,
  }) => {
    const canvas = page.locator('canvas').first()
    const hide = (hidden: boolean) =>
      page.evaluate((hidden) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
        document.dispatchEvent(new Event('visibilitychange'))
      }, hidden)
    await canvas.scrollIntoViewIfNeeded()
    const still = await canvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
    expect(await runs(page)).toBe(false)

    await stir(page)
    expect(await runs(page)).toBe(true)
    await hide(true)
    expect(await runs(page)).toBe(false)
    await hide(false)
    expect(await runs(page)).toBe(true)

    await stir(page)
    await page.evaluate(() => scrollTo(0, 0))
    await expect(canvas).not.toBeInViewport()
    expect(await runs(page)).toBe(false)
    await canvas.scrollIntoViewIfNeeded()
    expect(await runs(page)).toBe(true)

    await stir(page)
    await page.evaluate(() => document.querySelector('main')!.setAttribute('inert', ''))
    expect(await runs(page)).toBe(false)
    await page.evaluate(() => document.querySelector('main')!.removeAttribute('inert'))
    expect(await runs(page)).toBe(true)

    // Left alone the dots find their way home, and the engine stops by itself.
    await expect
      .poll(() => canvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()))
      .toBe(still)
    await expect.poll(() => runs(page)).toBe(false)

    for (const [name, on, off] of [
      ['motion', 'reduce', 'full'],
      ['pause', 'on', 'off'],
    ]) {
      await stir(page)
      expect(await runs(page)).toBe(true)
      await setting(page, name, on)
      await canvas.scrollIntoViewIfNeeded()
      expect(await canvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(still)
      await stir(page)
      expect(await runs(page)).toBe(false)
      await setting(page, name, off)
      await canvas.scrollIntoViewIfNeeded()
    }
  })

  test('steps the dot engine on a fixed clock: the same picture at 30, 60 and 120 frames a second', async ({
    page,
  }) => {
    // The test hands out the frames, and chance is taken out of the sweep home.
    await page.addInitScript(() => {
      const waiting = new Map<number, FrameRequestCallback>()
      let last = 0
      Math.random = () => 0.5
      window.requestAnimationFrame = (callback) => waiting.set(++last, callback) && last
      window.cancelAnimationFrame = (request) => waiting.delete(request)
      Object.assign(window, {
        frame: (now: number) => {
          const due = [...waiting.values()]
          waiting.clear()
          for (const callback of due) callback(now)
        },
      })
    })

    const pictures: string[] = []
    for (const rate of [30, 60, 120]) {
      await page.goto('/catalogue/motion', { waitUntil: 'networkidle' })
      const canvas = page.locator('canvas').first()
      const picture = (now: number) =>
        canvas.evaluate((canvas: HTMLCanvasElement, now) => {
          ;(Reflect.get(window, 'frame') as (now: number) => void)(now)
          return canvas.toDataURL()
        }, now)
      const still = await picture(0)
      await canvas.click({ position: { x: 100, y: 120 } })
      // The engine's first frame is one step whenever it comes; the rest are counted from it.
      await expect.poll(() => picture(1000)).not.toBe(still)
      for (let now = 1000 / rate; now < 510; now += 1000 / rate) await picture(1000 + now)
      pictures.push(await picture(1510))
    }
    expect(pictures[1]).toBe(pictures[0])
    expect(pictures[2]).toBe(pictures[0])

    // A tenth of a second later the picture has moved on: it was caught in flight.
    const later = await page
      .locator('canvas')
      .first()
      .evaluate((canvas: HTMLCanvasElement) => {
        ;(Reflect.get(window, 'frame') as (now: number) => void)(1610)
        return canvas.toDataURL()
      })
    expect(later).not.toBe(pictures[0])
  })
})
