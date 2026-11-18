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

// What axe finds of too little contrast, and what it leaves out, once everything has arrived.
async function contrast(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1000)
  const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
  return [
    ...violations.flatMap(({ nodes }) =>
      nodes.map(({ target, any }) => `${target} ${any[0]?.message}`),
    ),
    ...(await page.evaluate(ratios)),
  ]
}

test.describe('Light theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  })

  test('every catalogue page reads in light, in both languages', async ({ page }) => {
    test.slow()
    for (const language of ['', '/de']) {
      for (const name of catalogue) {
        await page.goto(`${language}/catalogue${name}`)
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
        expect(await contrast(page), `${language}/catalogue${name}`).toEqual([])
      }
    }
  })

  test('every window reads in light, at three sizes and in both languages', async ({
    page,
    request,
  }) => {
    test.setTimeout(900_000)
    for (const language of ['en', 'de']) {
      const view = await (await request.get(`/view/${language}/`)).json()
      const paths: string[] = view.search.map(({ href }: { href: string }) => href)
      for (const size of sizes) {
        await page.setViewportSize(size)
        for (const path of paths) {
          await page.goto(path)
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
          expect(await contrast(page), `${path} at ${size.width}`).toEqual([])
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
