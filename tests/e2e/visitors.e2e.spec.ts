import { login } from './login'
import { expect, test } from './test'

test.describe('A visitor in the admin', () => {
  const made: string[] = []
  const stamp = Date.now().toString(36)

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    for (const route of made.splice(0)) await page.request.delete(route)
  })

  test('is saved with the password the owner types, and offered only hidden windows', async ({
    page,
  }) => {
    for (const [title, hidden] of [
      [`Hidden ${stamp}`, true],
      [`Shown ${stamp}`, false],
    ] as const) {
      const response = await page.request.post('/api/windows?locale=en', {
        data: { title, hidden, _status: 'published' },
      })
      made.push(`/api/windows/${(await response.json()).doc.id}`)
    }

    await page.goto('/admin/collections/visitors/create')
    await page.fill('#field-name', `Visitor ${stamp}`)
    await page.locator('#field-windows').click()
    await page.keyboard.type(stamp)
    await expect(page.getByRole('option', { name: `Hidden ${stamp}` })).toBeVisible()
    await expect(page.getByRole('option', { name: `Shown ${stamp}` })).toHaveCount(0)
    await page.getByRole('option', { name: `Hidden ${stamp}` }).click()
    await page.fill('#field-password', `a-password-typed-${stamp}`)
    await page.click('#action-save')

    await page.waitForURL(/\/admin\/collections\/visitors\/\d+/)
    made.push(`/api/visitors/${page.url().match(/visitors\/(\d+)/)![1]}`)
    // The password is kept nowhere it could be shown again: its link shows in the answer to this save alone.
    await expect(page.locator('#field-password')).toHaveValue('')
    await expect(page.locator('#field-link')).toHaveValue(
      new RegExp(`/login#p=a-password-typed-${stamp}\\n.*/privacy-policy$`),
    )
    await page.reload()
    await expect(page.locator('#field-name')).toHaveValue(`Visitor ${stamp}`)
    await expect(page.locator('#field-link')).toHaveCount(0)
  })

  test('saved again with a new password, has an empty password field', async ({ page }) => {
    const response = await page.request.post('/api/visitors', {
      data: { name: `Again ${stamp}`, password: `a-first-password-${stamp}` },
    })
    const { id } = (await response.json()).doc
    made.push(`/api/visitors/${id}`)

    await page.goto(`/admin/collections/visitors/${id}`)
    await page.fill('#field-password', `a-second-password-${stamp}`)
    await page.click('#action-save')

    await expect(page.locator('#field-link')).toHaveValue(/\/login#p=a-second-password-/)
    await expect(page.locator('#field-password')).toHaveValue('')
  })
})
