import { expect, type Page, test as base } from '@playwright/test'

import { file } from '../fixtures/neutral'

// Every test fails when its page throws or logs an error.
export const test = base.extend<{ pageErrors: void; uploads: void; intro: boolean; played: void }>({
  // A tab has seen the intro unless a test asks for it, so the desk at / is there at once.
  intro: [false, { option: true }],
  played: [
    async ({ context, intro }, use) => {
      // Every tab of the context, a second one too.
      if (!intro) await context.addInitScript(() => sessionStorage.setItem('intro', 'played'))
      await use()
    },
    { auto: true },
  ],
  // Without the store an upload is a file only signed-in users may read, so a picture is served from its local file.
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
