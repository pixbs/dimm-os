import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Logs the first admin into the admin panel via the login page.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/admin/login')

  await page.fill('#field-email', process.env.ADMIN_EMAIL!)
  await page.fill('#field-password', process.env.ADMIN_PASSWORD!)
  await page.click('button[type="submit"]')

  await page.waitForURL('/admin')

  const dashboardArtifact = page.locator('.step-nav__first')
  await expect(dashboardArtifact).toBeVisible()
}
