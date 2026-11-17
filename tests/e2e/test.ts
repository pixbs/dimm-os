import { expect, type Page, test as base } from '@playwright/test'

import { file } from '../fixtures/neutral'

// Every test fails when its page throws or logs an error. Without the store, an upload is a file only the two users
// may read, so every picture the fixture uploaded is served from the local file it was made from.
export const test = base.extend<{ pageErrors: void; uploads: void }>({
  uploads: [
    async ({ page }, use) => {
      await page.route('**/_next/image?**', (route) =>
        new URL(route.request().url()).searchParams.get('url')?.startsWith('/api/media/file/')
          ? route.fulfill({ path: file, contentType: 'image/jpeg' })
          : route.fallback(),
      )
      await use()
    },
    { auto: true },
  ],
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(`page error: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console error: ${message.text()}`)
      })
      await use()
      expect(errors).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

// A tab that has shown the desk keeps its windows, so one that has shown none opens no window at start.
export const emptyDesk = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem('windows') === null) sessionStorage.setItem('windows', '[]')
  })
