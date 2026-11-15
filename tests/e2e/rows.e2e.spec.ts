import { expect, test } from './test'

test.describe('Row', () => {
  test('marks the current row with a dot as well as its fill, in both densities', async ({
    page,
  }) => {
    await page.goto('/catalogue/rows')
    const mark = (selector: string) =>
      page.locator(selector).evaluateAll((rows) =>
        rows.map((row) => {
          const dot = getComputedStyle(row, '::before')
          return [dot.content, dot.width, dot.height, dot.borderRadius]
        }),
      )

    const current = page.locator('.row[aria-current]')
    await expect(current).toHaveCount(2)
    expect(await mark('.row[aria-current]')).toEqual([
      ['""', '8px', '8px', '999px'],
      ['""', '8px', '8px', '999px'],
    ])
    expect(new Set((await mark('.row:not([aria-current])')).map(([content]) => content))).toEqual(
      new Set(['none']),
    )
  })

  test('holds its states on the real attributes, and changes them within fast', async ({
    page,
  }) => {
    await page.goto('/catalogue/rows')
    const states = page.locator('.cap', { hasText: /^states/ }).first()

    await expect(states.getByRole('button', { name: /^Selected/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(states.getByRole('button', { name: /^Disabled/ })).toBeDisabled()
    await expect(states.getByRole('link', { name: /^Current/ })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const row = states.getByRole('link', { name: /^Default/ })
    await expect(row).toHaveCSS('transition-duration', /^0\.16s/)
    expect(await row.evaluate((row) => getComputedStyle(row).transitionProperty)).toContain(
      'box-shadow',
    )
    await row.hover()
    await expect(row).toHaveCSS('box-shadow', /0\.08\) 0px 0px 0px 384px inset/)
    await page.mouse.down()
    await expect(row).toHaveCSS('box-shadow', /0\.16\) 0px 0px 0px 384px inset/)
    await page.mouse.up()
  })

  test('wraps long German labels and values, and cuts none', async ({ page }) => {
    await page.goto('/de/catalogue/rows')
    await page.evaluate(() => document.fonts.ready)

    const cut = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.row, .row *')]
        .filter((part) => part.checkVisibility() && !part.closest('svg'))
        .filter((part) => part.scrollWidth > part.clientWidth)
        .map((part) => part.textContent),
    )
    expect(cut).toEqual([])

    const label = (await page.locator('.row__label', { hasText: 'Barrierefrei' }).boundingBox())!
    expect(label.height).toBeGreaterThan(24)
  })

  test('puts the side on the first line in a compact window, with the trail at its end', async ({
    page,
  }) => {
    await page.goto('/catalogue/rows')
    const top = (selector: string) =>
      page
        .locator(`.cq .row >> nth=0 >> ${selector}`)
        .evaluate((part) => part.getBoundingClientRect().top)

    expect(await top('.row__trail')).toBe(await top('.row__side'))
    expect(await top('.row__main')).toBeGreaterThan(await top('.row__side'))
  })
})
