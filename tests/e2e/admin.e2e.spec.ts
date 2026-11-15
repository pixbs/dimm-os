import { login } from './login'
import { expect, test } from './test'

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('can navigate to dashboard', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    const dashboardArtifact = page.locator('.step-nav__first').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async ({ page }) => {
    await page.goto('/admin/collections/users')
    await expect(page).toHaveURL(/\/admin\/collections\/users/)
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async ({ page }) => {
    await page.goto('/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
