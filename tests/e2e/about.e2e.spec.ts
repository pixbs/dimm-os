import { execSync } from 'child_process'

import type { Page } from '@playwright/test'

import { expect, test } from './test'

// The version is the month of the commit the build was made from.
const version = execSync('git log -1 --format=%cd --date=format:%Y.%m', { encoding: 'utf8' }).trim()

const about = (page: Page) => page.locator('article[aria-label="About Dimm OS"]')
const plate = (page: Page) => about(page).getByRole('group', { name: 'Type plate of Dimm OS' })
const screw = (page: Page, corner: string) =>
  about(page).getByRole('button', { name: `Take out the ${corner} screw` })

test.describe('About', () => {
  test('is the type plate: the version, the field, the counts and the facts of the fixture', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/about', { waitUntil: 'networkidle' })
    const held = plate(page)
    await expect(held.getByRole('heading', { level: 1, name: 'Dimm OS' })).toBeVisible()
    await expect(held.getByText(`DIMM/OS v${version}`)).toBeVisible()
    for (const [label, value] of [
      ['Model', `Dimm OS v${version}`],
      ['Serial', 'Field no. 299'],
      ['Memory', '3 case studies'],
      ['Made in', 'Somewhere'],
      ['Operator', 'A name'],
    ])
      await expect(held.getByText(label, { exact: true }).locator('..')).toContainText(value)
    await expect(held.getByText(`Rev. ${version}`)).toBeVisible()

    await page.goto('/de/about', { waitUntil: 'networkidle' })
    await expect(page.getByText('3 Fallstudien')).toBeVisible()
  })

  test('opens and closes with keys alone', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/about', { waitUntil: 'networkidle' })
    // The first link skips to the window, and Tab goes on from its bar to the first screw.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    for (let presses = 0; presses < 5; presses++) {
      if (await screw(page, 'top left').evaluate((element) => element === document.activeElement))
        break
      await page.keyboard.press('Tab')
    }
    await expect(screw(page, 'top left')).toBeFocused()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await expect(plate(page)).not.toHaveAttribute('data-state')
    await page.keyboard.press('Enter')
    await expect(plate(page)).toHaveAttribute('data-state', 'hanging')
    await expect(plate(page)).toHaveAttribute('data-by', 'br')
    await page.keyboard.press('Enter')
    await expect(plate(page)).toHaveAttribute('data-state', 'fallen')
    await expect(about(page).locator('.bay__inside')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(about(page).getByRole('link', { name: 'Write' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(about(page).getByRole('link', { name: 'CV' })).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(plate(page)).not.toHaveAttribute('data-state')
    await expect(screw(page, 'top left')).toBeFocused()
    // What the plate covers again cannot be reached.
    await expect(about(page).locator('.bay__inside')).toHaveAttribute('inert')
  })

  test('swings on the last screw and falls; with reduced motion it stays straight and fades', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/about', { waitUntil: 'networkidle' })
    for (const corner of ['top right', 'bottom right', 'bottom left'])
      await screw(page, corner).click()
    await expect(plate(page)).toHaveAttribute('data-by', 'tl')
    // Hung from the top left, its middle comes straight under the screw: it turns the way of the clock.
    await expect
      .poll(() =>
        plate(page).evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).b),
      )
      .toBeGreaterThan(0)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload({ waitUntil: 'networkidle' })
    for (const corner of ['top left', 'top right', 'bottom left', 'bottom right'])
      await screw(page, corner).click()
    await expect(plate(page)).toHaveAttribute('data-state', 'fallen')
    expect(await plate(page).evaluate((element) => getComputedStyle(element).transform)).toBe(
      'none',
    )
    await expect(plate(page)).toHaveCSS('opacity', '0')
    await expect(
      about(page).getByRole('heading', { name: 'A heading behind the plate.' }),
    ).toBeVisible()
  })
})
