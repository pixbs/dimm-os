import { expect, test as base } from '@playwright/test'

// Every test fails when its page throws or logs an error.
export const test = base.extend<{ pageErrors: void }>({
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
