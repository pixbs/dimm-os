import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

// The fixture items: Grow holds facts, a quotation and figures; Field a table and facts joined to text.
const work = (page: Page) => page.locator('#window-work')
const section = (window: Locator, heading: string) =>
  window.locator('section', {
    has: window.page().getByRole('heading', { name: heading, exact: true }),
  })
const tops = async (parts: Locator) =>
  new Set(await Promise.all((await parts.all()).map(async (one) => (await one.boundingBox())!.y)))
const size = (part: Locator) => part.evaluate((element) => getComputedStyle(element).fontSize)

test.describe('Figures, quotations, facts and tables', () => {
  test('stand figures one, two and three across as the window allows, and two beside a heading', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/work/grow')
    const figures = section(work(page), 'Figures').locator('.stat')

    await expect(figures).toHaveCount(3)
    expect((await tops(figures)).size).toBe(3)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    expect((await tops(figures)).size).toBe(2)

    // In a wide window the heading takes one column of three, so three figures stand two across.
    await work(page).getByRole('button', { name: 'Full screen' }).click()
    await expect(work(page).locator('.window__body')).toHaveJSProperty('clientWidth', 1440)
    await expect.poll(async () => (await tops(figures)).size).toBe(2)
  })

  test('never sets a label smaller than its value', async ({ page }) => {
    await page.goto('/work/grow')
    const figure = section(work(page), 'Figures').locator('.stat').first()
    const fact = work(page).locator('.list > .row').first()

    expect(await size(figure.locator('.stat__label'))).toBe(
      await size(figure.locator('.stat__value')),
    )
    expect(await size(fact.locator('.row__label'))).toBe(await size(fact.locator('.row__value')))

    await page.goto('/work/field')
    const table = work(page).getByRole('table').first()
    expect(await size(table.getByRole('columnheader').first())).toBe(
      await size(table.getByRole('cell').first()),
    )
  })

  test('deciphers a count as it is first seen, and leaves what the server painted as it is', async ({
    page,
  }) => {
    await page.goto('/work/grow')
    const cipher = (page: Page) =>
      section(work(page), 'Figures').locator('.decipher > [aria-hidden]').first()
    await expect(cipher(page)).toBeEmpty()

    // Opened from its list, the item is drawn here: the count waits below the fold, then deciphers once in view.
    await page.goto('/work')
    await work(page).getByRole('link', { name: 'Grow' }).click()
    await expect(cipher(page)).not.toBeEmpty()
    await cipher(page).scrollIntoViewIfNeeded()
    await expect(cipher(page)).toBeEmpty()
    await expect(section(work(page), 'Figures').locator('.stat__value').first()).toHaveText('12')
  })

  test('shows a count at once under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/work')
    await work(page).getByRole('link', { name: 'Grow' }).click()

    await expect(section(work(page), 'Figures').locator('.stat__value').first()).toHaveText('12')
    await expect(
      section(work(page), 'Figures').locator('.decipher > [aria-hidden]').first(),
    ).toBeEmpty()
  })

  test('sets a quotation on its own surface, with who said it', async ({ page }) => {
    await page.goto('/work/grow')
    const quote = work(page).locator('.section:has(.quote)')

    await expect(quote).toHaveAttribute('data-surface', 'paper')
    await expect(quote.locator('blockquote')).toHaveCSS('font-size', '28px')
    await expect(quote.locator('figcaption')).toHaveText('A participantInterview')
    await expect(quote.locator('.avatar img')).toHaveAttribute('alt', '')
  })

  test('folds a table of three columns in a compact window, each cell beside its column label', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/work/field')
    const table = work(page).getByRole('table').first()
    // The head is the first row; the third holds the cell long enough to wrap.
    const cells = table.locator('.table__row').nth(2).locator('.table__cell')

    await expect(table.locator('.table__head')).toBeHidden()
    await expect(cells.first()).toHaveCSS('font-weight', '500')
    expect(await cells.nth(1).evaluate((cell) => getComputedStyle(cell, '::before').content)).toBe(
      '"Kind"',
    )
    // Stacked, every cell is read on its own line, and nothing runs past the window.
    expect((await tops(cells)).size).toBe(3)
    expect(await table.evaluate((table) => table.scrollWidth <= table.clientWidth)).toBe(true)
    // A cell left empty says nothing when folded.
    await expect(table.locator('.table__row').last().locator('.table__cell').last()).toBeHidden()

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await expect(table.locator('.table__head')).toBeVisible()
    expect((await tops(cells)).size).toBe(1)
    expect(await cells.nth(1).evaluate((cell) => getComputedStyle(cell, '::before').content)).toBe(
      'none',
    )
  })

  test('joins facts and a table to the text above, under its heading, which a table keeps above it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work/field')
    await work(page).getByRole('button', { name: 'Full screen' }).click()
    await expect(work(page).locator('.window__body')).toHaveJSProperty('clientWidth', 1440)
    const joined = section(work(page), 'Text and facts')

    await expect(joined.locator('.section__body > *')).toHaveClass(['prose', 'list', 'table'])
    await expect(joined.locator('.row__label')).toHaveText(['Label', 'A longer label'])
    // Beside a heading a table of three would make four columns, so the heading stands above.
    await expect(joined).not.toHaveAttribute('data-layout', 'split')
  })
})
