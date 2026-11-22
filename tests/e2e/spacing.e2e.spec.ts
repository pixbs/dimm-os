import { expect, test } from './test'

// For every title followed by a text in another type in its block, three distances on the letters, from a baseline to
// the top of the capitals under it: two lines of the larger of the two, the title to the text, and the block to the
// next. Each must be larger than the one before by half the smallest step of space; what breaks that is returned.
function broken(scope: string) {
  const canvas = document.createElement('canvas').getContext('2d')!
  const half = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s-1')) / 2

  type Line = {
    rect: DOMRect
    baseline: number
    top: number
    own: number
    type: string
    size: number
    scale: number
  }
  const lines = (part: Element) => {
    const found: Line[] = []
    const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement!
      if (!node.textContent?.trim() || element.closest('svg')) continue
      if (!element.checkVisibility({ visibilityProperty: true })) continue
      const style = getComputedStyle(element)
      const size = parseFloat(style.fontSize)
      const font = (size: string) =>
        `${style.fontStyle} ${style.fontWeight} ${size} ${style.fontFamily}`
      canvas.font = font(style.fontSize)
      const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } =
        canvas.measureText('H')
      // The canvas rounds what it measures to whole pixels, so the capitals are measured large.
      canvas.font = font('1000px')
      const capitals = (canvas.measureText('H').actualBoundingBoxAscent * size) / 1000
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (!rect.width) continue
        // A part drawn at another size, such as a small copy of a window, is measured at its own.
        const scale = rect.height / (ascent + descent)
        const baseline = rect.top + ascent * scale
        const cap = capitals * scale
        const pitch = parseFloat(style.lineHeight) * scale
        const type = `${style.fontWeight} ${style.fontSize}`
        found.push({ rect, baseline, top: baseline - cap, own: pitch - cap, type, size, scale })
      }
    }
    return found
  }

  const report: string[] = []
  for (const root of document.querySelectorAll(scope)) {
    for (const title of root.querySelectorAll('[class*="__title"]')) {
      const last = lines(title).at(-1)
      if (!last) continue
      let text = title.nextElementSibling
      while (text && !lines(text).length) text = text.nextElementSibling
      const first = text && lines(text)[0]
      // A text beside the title, or in its type, is not a second text under it.
      if (!first || first.rect.top < last.rect.bottom || first.type === last.type) continue

      const name = [...title.classList].find((name) => name.endsWith('__title'))!.split('__')[0]
      const block = title.closest(`.${name}`) ?? title.parentElement!
      const box = block.getBoundingClientRect()
      const end = Math.max(...lines(block).map((line) => line.baseline))
      let next: Line[] = []
      for (let at: Element | null = block; !next.length && at && at !== root;) {
        for (let after = at.nextElementSibling; !next.length && after;) {
          next = lines(after).filter(
            ({ rect }) => rect.top >= box.bottom && rect.left < box.right && rect.right > box.left,
          )
          after = after.nextElementSibling
        }
        at = at.parentElement
      }

      const distances = [
        (first.size > last.size ? first : last).own,
        first.top - last.baseline,
        next.length ? Math.min(...next.map((line) => line.top)) - end : Infinity,
      ]
      if (distances.some((distance, at) => at && distance < distances[at - 1] + half * last.scale))
        report.push(
          `${title.textContent} / ${text!.textContent}: ${distances.map((d) => d.toFixed(1)).join(' < ')}`,
        )
    }
  }
  return report
}

test.describe('Space on the letters', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const width of [390, 1440]) {
    test(`a title stands further from its text than from its own lines, and nearer than the next block, on every page of the catalogue at ${width}`, async ({
      page,
    }) => {
      test.slow()
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/catalogue')
      const pages = await page
        .locator('.doc__nav a:not([hreflang])')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')!))
      expect(pages.length).toBeGreaterThan(1)

      for (const path of pages) {
        await page.goto(path)
        await page.evaluate(() => document.fonts.ready)
        expect(await page.evaluate(broken, '.cap'), path).toEqual([])
      }
    })
  }

  test('the text under a large title on the services window stands apart from it at phone size', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/services')
    const rows = page.locator('#window-services .row[data-scale="heading"]')
    await expect(rows.first()).toBeVisible()
    await page.evaluate(() => document.fonts.ready)

    expect(await rows.locator('.row__main > .row__text').count()).toBeGreaterThan(0)
    expect(await page.evaluate(broken, '#window-services')).toEqual([])
  })
})
