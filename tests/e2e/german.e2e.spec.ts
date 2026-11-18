import type { Page } from '@playwright/test'

import de from '../../src/i18n/de'
import en from '../../src/i18n/en'
import { emptyDesk, expect, test } from './test'

// Every whole sentence or label of the English dictionary that German writes otherwise.
const words = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : Array.isArray(value) || (value && typeof value === 'object')
      ? Object.values(value).flatMap(words)
      : []
const german = new Set(words(de))
const english = [...new Set(words(en))].filter(
  (word) => !german.has(word) && !word.includes('{') && word.length > 2,
)
const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// What the page says in its own language: parts marked as English are left out.
const said = (page: Page) =>
  page.evaluate(() => {
    const copy = document.body.cloneNode(true) as HTMLElement
    copy.querySelectorAll('[lang]:not([lang="de"]), script, style').forEach((part) => part.remove())
    document.body.append(copy)
    copy.style.cssText = 'position:absolute;visibility:hidden'
    const text = copy.innerText
    copy.remove()
    return text
  })

const screens = ['/de', '/de/hotkeys', '/de/preferences', '/de/about']

test.describe('German interface', () => {
  for (const [width, height] of [
    [1440, 1000],
    [834, 1194],
    [390, 844],
  ])
    test(`says no English word of the interface at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      for (const path of screens) {
        await page.goto(path, { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('lang', 'de')
        const text = await said(page)
        const left = english.filter((word) => new RegExp(`\\b${escape(word)}\\b`).test(text))
        expect(left, path).toEqual([])
      }
    })

  test('reads the legal links as Impressum, Datenschutz and Cookies', async ({ page }) => {
    await emptyDesk(page)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/de', { waitUntil: 'networkidle' })
    const foot = page.locator('footer[data-for="desk"]')

    for (const name of ['Impressum', 'Datenschutz', 'Cookies'])
      await expect(foot.getByRole('link', { name, exact: true })).toBeVisible()
  })
})
