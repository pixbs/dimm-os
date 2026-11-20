import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { expect, test } from './test'

const catalogue = [
  '',
  '/colour',
  '/type',
  '/space',
  '/icons',
  '/motion',
  '/actions',
  '/rows',
  '/inputs',
  '/content',
  '/shell',
  '/lists',
  '/records',
  '/sections',
  '/collections',
]
const sizes = [
  { width: 390, height: 844 },
  { width: 834, height: 1112 },
  { width: 1440, height: 900 },
]

// Every element with text of its own, held against what it stands on: its colour laid over the backgrounds and the state
// fills under it. Axe leaves out what stands on a gradient, which every row of a list does, so this reads those too.
function ratios() {
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgba = (colour: string) => {
    probe.clearRect(0, 0, 1, 1)
    probe.fillStyle = colour
    probe.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }
  const over = ([r, g, b, a]: number[], [R, G, B]: number[]) => [
    r * a + R * (1 - a),
    g * a + G * (1 - a),
    b * a + B * (1 - a),
  ]
  const luminance = (rgb: number[]) => {
    const [r, g, b] = rgb.map((v) =>
      v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4,
    )
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ground = (element: Element) => {
    const layers: number[][] = []
    for (let at: Element | null = element; at; at = at.parentElement) {
      const style = getComputedStyle(at)
      const fill = style.boxShadow.match(/^((?:rgba?|color)\([^)]*\)) 0px 0px 0px \d{3,}px inset/)
      if (fill) layers.push(rgba(fill[1]))
      const colour = rgba(style.backgroundColor)
      layers.push(colour)
      if (colour[3] === 1) break
    }
    return layers.reverse().reduce((base, layer) => over(layer, base), [255, 255, 255])
  }
  const low: string[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement!
    // What is hidden, a cipher over its text, and a position of a slide, which stands on its block beside it.
    if (!node.textContent?.trim() || !element.checkVisibility({ opacityProperty: true })) continue
    if (
      element.closest('[aria-hidden="true"], [inert], .decipher > :not(:first-child), .slide__pos')
    )
      continue
    const style = getComputedStyle(element)
    const back = ground(element)
    const [a, b] = [luminance(over(rgba(style.color), back)), luminance(back)].sort((x, y) => y - x)
    const ratio = (a + 0.05) / (b + 0.05)
    if (ratio < (parseFloat(style.fontSize) >= 24 ? 3 : 4.5))
      low.push(`${ratio.toFixed(2)} "${node.textContent.trim().slice(0, 24)}" ${element.className}`)
  }
  return [...new Set(low)]
}

// What needs scrolling sideways, and what stands beside the screen where no scroll reaches it.
function sideways() {
  const found: string[] = []
  const root = document.documentElement
  if (root.scrollWidth > root.clientWidth + 1) found.push('the page scrolls sideways')
  for (const element of document.querySelectorAll<HTMLElement>('body *')) {
    if (!element.checkVisibility()) continue
    if (element.closest('[inert], [aria-hidden="true"], [data-unseen]')) continue
    const name = `${element.tagName.toLowerCase()}.${element.className}`
    const scrolls = /auto|scroll/.test(getComputedStyle(element).overflowX)
    if (scrolls && element.scrollWidth > element.clientWidth + 1)
      found.push(`${name} scrolls sideways`)
    const { left, right, width } = element.getBoundingClientRect()
    const text = !element.childElementCount && element.textContent?.trim()
    if (text && width && (left < -1 || right > innerWidth + 1))
      found.push(`${name} stands beside the screen: ${text.slice(0, 24)}`)
  }
  return [...new Set(found)]
}

// What axe finds, by every rule but those skipped, in light and then in dark, and in light the contrast it leaves out,
// once everything has arrived.
async function findings(page: Page, skip: string[] = []) {
  const axe = async () =>
    (await new AxeBuilder({ page }).disableRules(skip).analyze()).violations.flatMap(
      ({ id, nodes }) =>
        nodes.map(({ target, any }) => `${id}: ${target} ${any[0]?.message ?? ''}`),
    )
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1000)
  const light = [...(await axe()), ...(await page.evaluate(ratios))]
  // The other theme is the same page with the root's setting changed, as the theme button changes it.
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))
  await page.waitForTimeout(400)
  return [...light, ...(await axe()).map((found) => `in dark, ${found}`)]
}

test.describe('Light theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  })

  test('every catalogue page reads in light, and axe finds nothing in either theme, in both languages', async ({
    page,
  }) => {
    test.setTimeout(600_000)
    // A sheet draws many screens and repeats its specimens, so its landmarks are neither one nor unique.
    const sheet = ['landmark-main-is-top-level', 'landmark-no-duplicate-main', 'landmark-unique']
    for (const language of ['', '/de']) {
      for (const name of catalogue) {
        await page.goto(`${language}/catalogue${name}`)
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
        expect(await findings(page, sheet), `${language}/catalogue${name}`).toEqual([])
      }
    }
  })

  test('every window reads in light, axe finds nothing in either theme, and none scrolls sideways at 320 px, at three sizes and in both languages', async ({
    page,
    request,
  }) => {
    test.setTimeout(1_200_000)
    for (const language of ['en', 'de']) {
      const view = await (await request.get(`/view/${language}/`)).json()
      const root = language === 'en' ? '' : `/${language}`
      // A command of the system is a row without an address; the desk and the login are no rows of search.
      const paths: string[] = [
        root || '/',
        ...view.search.flatMap(({ href }: { href?: string }) => href ?? []),
        `${root}/login`,
      ]
      for (const size of sizes) {
        await page.setViewportSize(size)
        for (const path of paths) {
          await page.goto(path)
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
          expect(await findings(page), `${path} at ${size.width}`).toEqual([])
          if (size !== sizes[0]) continue
          // A browser 1280 px wide zoomed to 400 % is a screen of 320 by 256.
          await page.setViewportSize({ width: 320, height: 256 })
          await expect.poll(() => page.evaluate(sideways), `${path} at 320`).toEqual([])
          await page.setViewportSize(size)
        }
      }
    }
  })
})

test('switching theme is one crossfade, and no part changes on its own during it', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document)
    document.startViewTransition = (update) => {
      const fade = start(update as ViewTransitionUpdateCallback)
      Object.assign(window, { fade, fades: 1 + (Reflect.get(window, 'fades') ?? 0) })
      return fade
    }
  })
  await page.goto('/cv', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  // As the new theme is laid out under the crossfade, nothing starts a transition of its own.
  const own = await page.evaluate(async () => {
    await (Reflect.get(window, 'fade') as ViewTransition).updateCallbackDone
    await new Promise(requestAnimationFrame)
    return document
      .getAnimations()
      .filter((move) => move instanceof CSSTransition)
      .map((move) => ((move.effect as KeyframeEffect).target as Element).className)
  })
  expect(own).toEqual([])
  expect(await page.evaluate(() => Reflect.get(window, 'fades'))).toBe(1)
})
