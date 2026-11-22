import { expect, type Locator, type Page } from '@playwright/test'

type Box = { x: number; y: number; width: number; height: number }
type Way = {
  // The box of the thing in each frame of its move, and beside it the width of what it was, if it was anything.
  boxes: (Box & { was: number })[]
  // How many of it there were at most, and what its places said meanwhile.
  most: number
  said: string[]
}

// Watches a thing travel while `go` sends it, and checks what holds for every traveller: when the move has ended, the
// box of the element equals the box of its target within 1 px. It returns the way it took.
export async function travelled(page: Page, target: Locator, go: () => Promise<unknown>) {
  await page.evaluate(() => {
    const way: Way = { boxes: [], most: 0, said: [] }
    Object.assign(window, { way })
    requestAnimationFrame(function look() {
      const flyers = document.querySelectorAll('[data-travels="flies"]')
      way.most = Math.max(way.most, flyers.length)
      for (const place of document.querySelectorAll<HTMLElement>('[data-travels]'))
        if (!way.said.includes(place.dataset.travels!)) way.said.push(place.dataset.travels!)
      if (flyers[0]) {
        const { x, y, width, height } = flyers[0].getBoundingClientRect()
        const was = flyers[0].querySelector('[data-travels="was"] > *')
        way.boxes.push({ x, y, width, height, was: was?.getBoundingClientRect().width ?? 0 })
      }
      requestAnimationFrame(look)
    })
  })
  await go()
  // What `go` sets off may start a moment later, as a transition does, and on a busy page it may end between two looks
  // from here, though never between two frames. Its places say nothing once the move is over and the place it left has
  // gone.
  await expect
    .poll(() => page.evaluate(() => (Reflect.get(window, 'way') as Way).said.length))
    .toBeGreaterThan(0)
  await expect(page.locator('[data-travels]')).toHaveCount(0)
  const way = await page.evaluate(() => Reflect.get(window, 'way') as Way)
  const end = way.boxes.at(-1)
  if (end) {
    const to = (await target.boundingBox())!
    for (const side of ['x', 'y', 'width', 'height'] as const)
      expect(Math.abs(end[side] - to[side]), side).toBeLessThanOrEqual(1)
  }
  return way
}
