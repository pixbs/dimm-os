import type { Page } from '@playwright/test'

import { emptyDesk, expect, test } from './test'
import { travelled } from './travels'

const waiting = (page: Page) => page.locator('.screen[data-waiting]')
const tag = (page: Page) => page.locator('header [data-visitor] .tag')
const sizes = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1280, height: 900 },
}

// The login of the desk, with the box its avatar has there.
async function login(page: Page) {
  await page.locator('header [data-visitor]').click()
  const avatar = waiting(page).locator('.avatar[data-size="large"]')
  await expect(avatar).toHaveText('G')
  return (await avatar.boundingBox())!
}

test.describe('What travels from the login into the menu bar', () => {
  test.beforeEach(({ page }) => emptyDesk(page))

  for (const [name, size] of Object.entries(sizes)) {
    test(`the avatar lands as the tag, one box all the way, on a ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('/', { waitUntil: 'networkidle' })
      const direct = (await tag(page).boundingBox())!
      const avatar = await login(page)

      const way = await travelled(page, tag(page), () =>
        waiting(page).getByRole('button', { name: 'Enter' }).click(),
      )
      await expect(waiting(page)).toHaveCount(0)

      // One element left the box of the avatar, and nothing of the old move by hand is left.
      expect(way.most).toBe(1)
      expect(Math.abs(way.boxes[0].x - avatar.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(way.boxes[0].width - avatar.width)).toBeLessThanOrEqual(1)

      // Halfway it is one box between the two sizes, and the letter it was shrinks toward the one it becomes.
      const half = way.boxes[Math.floor(way.boxes.length / 2)]
      for (const side of ['width', 'height'] as const) {
        expect(half[side]).toBeGreaterThan(direct[side] + 1)
        expect(half[side]).toBeLessThan(avatar[side] - 1)
      }
      expect(half.was).toBeLessThan(avatar.width - 1)

      // It went across on one curve and up on another, so it left the straight line between the two places.
      const off = way.boxes.map((box) => {
        const share = (side: 'x' | 'y') =>
          (box[side] - avatar[side]) / (direct[side] - avatar[side])
        return Math.abs(share('y') - share('x'))
      })
      expect(Math.max(...off)).toBeGreaterThan(0.05)

      // The tag stands where it stands on a desk that was loaded directly.
      const after = (await tag(page).boundingBox())!
      for (const side of ['x', 'y', 'width', 'height'] as const)
        expect(Math.abs(after[side] - direct[side]), side).toBeLessThanOrEqual(1)
      await expect(tag(page)).toBeVisible()
    })
  }

  test('with reduced motion nothing travels: the avatar fades and the tag fades in', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(sizes.desktop)
    await page.goto('/', { waitUntil: 'networkidle' })
    await login(page)

    const way = await travelled(page, tag(page), () =>
      waiting(page).getByRole('button', { name: 'Enter' }).click(),
    )
    expect(way.most).toBe(0)
    expect(way.said.sort()).toEqual(['in', 'out'])
    await expect(tag(page)).toHaveCSS('opacity', '1')
  })
})
