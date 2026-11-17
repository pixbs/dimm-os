import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

// The fixture's cards: Field ends with three raised cards under a heading and two written by hand, one with a button to a
// window a guest may not see; Hello is a window of two tiles.
const win = (page: Page, slug: string) => page.locator(`#window-${slug}`)
const box = async (part: Locator) => (await part.boundingBox())!
const drag = async (
  page: Page,
  from: Locator,
  dx: number,
  dy: number,
  at: { x: number; y: number },
) => {
  const { x, y } = await box(from)
  await page.mouse.move(x + at.x, y + at.y)
  await page.mouse.down()
  await page.mouse.move(x + at.x + dx, y + at.y + dy, { steps: 4 })
}

// The tiles fill the body of their window, one step in from its edges, and stand side by side.
async function fills(window: Locator) {
  const [body, tiles] = [
    await box(window.locator('.window__body')),
    await box(window.locator('.tiles')),
  ]
  expect(Math.abs(tiles.height - body.height)).toBeLessThanOrEqual(1)
  const [first, second] = [
    await box(window.locator('.tiles > .card').first()),
    await box(window.locator('.tiles > .card').last()),
  ]
  expect(second.y).toBe(first.y)
  expect(second.x).toBeGreaterThan(first.x + first.width)
  expect(Math.abs(first.height - (body.height - 16))).toBeLessThanOrEqual(1)
}

test.describe('Cards and tiles', () => {
  test('fill a window with tiles, the statement its title and its buttons at the foot, while it is resized', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/hello')
    const hello = win(page, 'hello')
    const statement = hello.locator('.tiles > .card').last()

    await expect(hello.getByRole('heading', { level: 1 })).toHaveText(
      'A window that says one thing.',
    )
    await expect(hello.getByRole('heading', { level: 2 })).toHaveText('A name')
    await expect(statement.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work')
    await expect(statement.getByRole('link', { name: 'Download' })).toHaveAttribute('download', '')
    // The heading of a statement sits in the middle of the space its buttons leave.
    const [heading, group] = [
      await box(statement.locator('.hgroup')),
      await box(statement.locator('.btngroup')),
    ]
    const top = (await box(statement)).y
    expect(Math.abs(heading.y - top - (group.y - heading.y - heading.height))).toBeLessThanOrEqual(
      2,
    )
    expect(group.y + group.height).toBe(top + (await box(statement)).height)
    await fills(hello)

    // Taller and wider as an edge is pulled, and again once it is let go.
    await drag(page, hello.locator('[data-edge="s"]'), 0, 120, { x: 40, y: 1 })
    await fills(hello)
    await page.mouse.up()
    await drag(page, hello.locator('[data-edge="e"]'), 160, 0, { x: 1, y: 40 })
    await page.mouse.up()
    await fills(hello)
  })

  test('stack tiles in a compact window, a tile with a picture 4:3, buttons side by side', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/de/hello')
    const tiles = win(page, 'hello').locator('.tiles > .card')
    const [first, second] = [await box(tiles.first()), await box(tiles.last())]

    expect(second.y).toBeGreaterThan(first.y + first.height)
    expect(Math.abs(first.width / first.height - 4 / 3)).toBeLessThan(0.02)
    const buttons = tiles.last().locator('.btn')
    await expect(buttons).toHaveText(['Arbeit', 'Herunterladen'])
    expect((await box(buttons.last())).y).toBe((await box(buttons.first())).y)
  })

  for (const [width, across] of [
    [1440, 2],
    [834, 2],
    [390, 1],
  ] as const)
    test(`stand ${across} across under their heading in a window ${width} wide`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/work/field')
      const work = win(page, 'work')
      if (width > 600) await work.getByRole('button', { name: 'Full screen' }).click()
      const section = work.locator('section', {
        has: page.getByRole('heading', { name: 'Three cards' }),
      })
      const cards = section.locator('.card')
      await cards.last().scrollIntoViewIfNeeded()

      await expect(cards).toHaveCount(3)
      // In a wide window the heading takes one column of three, so the cards take two.
      const tops = await Promise.all([0, 1, 2].map(async (at) => (await box(cards.nth(at))).y))
      expect(new Set(tops.slice(0, across)).size).toBe(1)
      expect(tops[across]).toBeGreaterThan(tops[0])
      await expect(section.getByRole('heading', { name: 'One', level: 3 })).toBeVisible()
      await expect(cards.first().locator('img')).toHaveAttribute(
        'alt',
        'A sun setting over two hills',
      )
    })

  test('open a window under its title, and leave out a card that leads to one the viewer may not see', async ({
    page,
  }) => {
    await page.goto('/work/field')
    const work = win(page, 'work')
    const card = (title: string) =>
      work.locator('.card', { has: page.getByRole('heading', { name: title }) })

    await expect(card('On paper').getByRole('link')).toHaveText('Grow')
    await expect(card('On paper').getByRole('link')).toHaveAttribute('href', '/work/grow')
    await expect(card('On orange')).toHaveCount(0)
    await expect(work).not.toContainText('only an invited visitor')
  })
})
