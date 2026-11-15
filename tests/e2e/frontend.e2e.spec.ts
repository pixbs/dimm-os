import { expect, test } from './test'

test.describe('Frontend', () => {
  test('can go on homepage', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle('Dimm OS')
  })
})
