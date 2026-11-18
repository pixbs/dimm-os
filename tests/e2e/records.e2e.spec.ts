import type { Page } from '@playwright/test'

import { expect, test } from './test'

const win = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)
const month = () =>
  new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(new Date())

test.describe('Paper and aside', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a paper window opens as a record and says when it was updated', async ({ page }) => {
    await page.goto('/cv', { waitUntil: 'networkidle' })
    const head = win(page, 'CV').locator('.record__head')

    await expect(head.locator('.record__stamp')).toContainText('FIX/CV.01')
    await expect(head.getByRole('heading', { level: 1 })).toHaveText('CV')
    await expect(head.locator('.record__rule')).toBeVisible()
    // Titled groups are headed, the facts among them too.
    await expect(win(page, 'CV').locator('.list[data-headed] > .list__head')).toHaveText([
      /A group/,
      /Another group/,
      /A group of facts/,
    ])
    const foot = win(page, 'CV').locator('.record__foot')
    await expect(foot).toHaveText(`Updated ${month()}`)
    await expect(foot).not.toContainText(/page/i)
  })

  test('a record card at the end holds facts and buttons, and nothing moves it', async ({
    page,
  }) => {
    await page.goto('/imprint', { waitUntil: 'networkidle' })
    const card = win(page, 'Imprint').getByRole('region', { name: 'A record' })

    await expect(card.locator('.record__stamp')).toContainText('FIX/IMP.01')
    await expect(card.locator('.list[data-ruled] .row__label')).toHaveText([
      'A label',
      'Another label',
    ])
    await expect(card.getByRole('link')).toHaveText(['Write', 'Call'])
    await expect(card.getByRole('button')).toHaveCount(0)
    // In a wide window it stands beside the lead.
    const lead = (await win(page, 'Imprint').getByRole('heading', { level: 1 }).boundingBox())!
    expect((await card.boundingBox())!.x).toBeGreaterThan(lead.x + lead.width)
  })

  test('the contents index numbers the chapters, holds the one in view and leads to each', async ({
    page,
  }) => {
    await page.goto('/privacy-policy', { waitUntil: 'networkidle' })
    const policy = win(page, 'Privacy')
    const index = policy.getByRole('region', { name: 'Contents' })
    const rows = index.locator('.list .row:not(.list__head)')
    const chapters = ['A first chapter', 'A second chapter', 'A third chapter', 'A fourth chapter']

    await expect(rows.locator('.row__title')).toHaveText(chapters)
    await expect(rows.locator('.row__meta')).toHaveText(['01', '02', '03', '04'])
    await expect(policy.locator('.section .hgroup__eyebrow')).toHaveText(['01', '02', '03', '04'])
    await expect(rows.first()).toHaveAttribute('aria-current', 'page')

    // A row leads to its chapter, which takes the focus, and its row is held as the chapter comes into view.
    await rows.nth(2).click()
    const third = policy.locator('section', {
      has: page.getByRole('heading', { name: chapters[2] }),
    })
    await expect(third).toBeFocused()
    await expect(rows.nth(2)).toHaveAttribute('aria-current', 'page')
    await expect(rows.first()).not.toHaveAttribute('aria-current')
    await expect(index.locator('.record__foot')).toHaveText('03 / 04')
  })
})

test.describe('Paper and aside on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the contents fold into a bar that opens them', async ({ page }) => {
    await page.goto('/privacy-policy', { waitUntil: 'networkidle' })
    const policy = win(page, 'Privacy')
    const bar = policy.locator('.page__bar')
    const index = policy.getByRole('region', { name: 'Contents' })

    await expect(bar).toContainText('01 / 04')
    await expect(bar).toContainText('A first chapter')
    await expect(index).toBeHidden()

    await bar.getByRole('button', { name: 'Contents' }).click()
    await expect(index).toBeVisible()
    await index.getByRole('link', { name: /A second chapter/ }).click()
    await expect(index).toBeHidden()
    await expect(
      policy.locator('section', { has: page.getByRole('heading', { name: 'A second chapter' }) }),
    ).toBeFocused()
    await expect(bar).toContainText('02 / 04')
  })
})
