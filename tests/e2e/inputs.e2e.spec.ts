import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

const field = (page: Page, label: string) =>
  page.locator('.row[data-kind="field"]', { has: page.getByText(label, { exact: true }) }).first()

// The colour and weight of a field's line, which its ::after draws as a shadow.
const line = (row: Locator) =>
  row.evaluate((row) => {
    const after = getComputedStyle(row, '::after')
    return [after.boxShadow, after.transitionDuration]
  })

// Where the pointer lands is rounded to the pixel, which moves the value by one or two.
const value = (dial: Locator) =>
  dial.getAttribute('aria-valuenow').then((now) => Math.round(Number(now) / 5) * 5)

test.describe('Inputs', () => {
  test('draws placeholders and empty values at 64 %', async ({ page }) => {
    await page.goto('/catalogue/inputs')

    const placeholder = field(page, 'Placeholder').locator('input')
    expect(
      await placeholder.evaluate((input) => getComputedStyle(input, '::placeholder').color),
    ).toMatch(/ 0\.64\)$/)
    await expect(field(page, 'Upload').locator('[data-empty]')).toHaveCSS('color', / 0\.64\)$/)
  })

  test('turns the line orange, pops the dot and fades the message in, within fast', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/catalogue/inputs')
    const email = field(page, 'Email')
    const dot = email.locator('.row__label > .dot')
    const message = email.locator('[data-error]')

    await expect(dot).toBeHidden()
    await expect(message).toBeHidden()
    // Valid, the field is not described by what would be wrong with it.
    await expect(email.locator('input')).toHaveAccessibleDescription('')
    await email.locator('input').fill('name')
    await email.locator('input').blur()

    await expect(dot).toBeVisible()
    await expect(message).toBeVisible()
    await expect(email.locator('input')).toHaveAccessibleErrorMessage(await message.innerText())
    await expect(dot).toHaveCSS('transition-duration', '0.16s')
    await expect(dot).toHaveCSS('transition-timing-function', 'cubic-bezier(0.3, 1.5, 0.55, 1)')
    await expect(message).toHaveCSS('transition-duration', '0.16s')
    await expect
      .poll(() => line(email))
      .toEqual(['rgb(255, 91, 31) 0px -2px 0px 0px inset', '0.16s'])

    // Mended, it is a field again.
    await email.locator('input').fill('name@example.com')
    await expect(dot).toBeHidden()
  })

  test('takes the darker orange on light surfaces', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/catalogue/inputs')

    await expect
      .poll(() => line(field(page, 'Error')))
      .toEqual(['rgb(235, 84, 29) 0px -2px 0px 0px inset', '0.16s'])
  })

  test('changes a switch and a checkbox within fast, and only their colour under reduced motion', async ({
    page,
  }) => {
    await page.goto('/catalogue/inputs')
    const row = page.locator('label.row', { hasText: 'What it changes.' })
    const knob = () =>
      row.locator('.toggle').evaluate((toggle) => {
        const after = getComputedStyle(toggle, '::after')
        return [after.transitionProperty, after.transitionDuration, after.transform]
      })

    await expect(
      page.locator('label.row', { hasText: 'A statement' }).locator('.toggle'),
    ).toHaveCSS('transition-duration', '0.16s')
    expect((await knob())[0]).toContain('transform')
    expect((await knob())[1]).toMatch(/^0\.16s/)

    // Pressed anywhere on its row, the switch goes off.
    await row.getByText('What it changes.').click()
    await expect(row.getByRole('switch')).not.toBeChecked()

    await page
      .locator('.doc__sets span', { hasText: 'motion' })
      .getByRole('button', { name: 'reduce', exact: true })
      .click()
    expect((await knob())[0]).not.toContain('transform')
    await row.click()
    await expect(row.getByRole('switch')).toBeChecked()
    expect((await knob())[2]).toBe('matrix(1, 0, 0, 1, 27, 0)')
  })

  test('sets the dial from a press on its scale, a drag, and keys', async ({ page }) => {
    await page.goto('/catalogue/inputs')
    const dial = page.getByRole('slider', { name: 'what it counts' })
    await dial.scrollIntoViewIfNeeded()
    const box = (await dial.boundingBox())!
    const reach = box.width / 2 - 4
    // A point on the scale, where the hand would stand at that share of a turn.
    const on = (turn: number) => ({
      x: box.x + box.width / 2 + reach * Math.sin(turn * 2 * Math.PI),
      y: box.y + box.height / 2 - reach * Math.cos(turn * 2 * Math.PI),
    })

    // A press three quarters of the way round sets three quarters of the range.
    await page.mouse.click(on(0.75).x, on(0.75).y)
    expect(await value(dial)).toBe(775)
    await expect(page.locator('.row .stat')).toContainText(
      (await dial.getAttribute('aria-valuenow'))!,
    )

    // A drag from there back round the bottom to a quarter.
    await page.mouse.move(on(0.75).x, on(0.75).y)
    await page.mouse.down()
    for (const turn of [0.65, 0.55, 0.45, 0.35, 0.25]) {
      await page.mouse.move(on(turn).x, on(turn).y, { steps: 2 })
    }
    await page.mouse.up()
    expect(await value(dial)).toBe(325)

    const now = () => dial.getAttribute('aria-valuenow').then(Number)
    const before = await now()
    await dial.press('ArrowRight')
    expect(await now()).toBe(before + 1)
    await dial.press('ArrowDown')
    await dial.press('ArrowLeft')
    expect(await now()).toBe(before - 1)
    await dial.press('PageUp')
    expect(await now()).toBe(before + 89)
    await dial.press('End')
    expect(await now()).toBe(999)
    await dial.press('Home')
    expect(await now()).toBe(100)
  })

  test('works with keys alone', async ({ page }) => {
    await page.goto('/catalogue/inputs')

    const check = page.getByRole('checkbox', { name: 'Option', exact: true }).last()
    await check.focus()
    await page.keyboard.press('Space')
    await expect(check).toBeChecked()

    const radio = page.getByRole('radiogroup', { name: 'Radio' }).first()
    await radio.getByRole('radio', { name: 'Option one' }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(radio.getByRole('radio', { name: 'Option two' })).toBeChecked()

    const slide = page.getByRole('radiogroup', { name: 'three positions' })
    await slide.getByRole('radio').first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(slide.getByRole('radio').nth(1)).toBeChecked()
    await expect
      .poll(() =>
        slide
          .locator('.slide__block')
          .evaluate((block) => Math.round(new DOMMatrix(getComputedStyle(block).transform).e)),
      )
      .toBe(
        await slide
          .locator('.slide__pos')
          .first()
          .evaluate((pos) => (pos as HTMLElement).offsetWidth),
      )

    const dip = page.getByRole('switch', { name: /What the second does/ })
    await dip.focus()
    await page.keyboard.press('Space')
    await expect(dip).toBeChecked()
    await expect(page.getByText('2 What the second does: on.')).toBeVisible()

    const select = field(page, 'Select').locator('select')
    await select.focus()
    await page.keyboard.press('ArrowDown')
    await expect(select).toHaveValue('Another option')

    const upload = field(page, 'Upload')
    const chooser = page.waitForEvent('filechooser')
    await upload.locator('input').focus()
    await page.keyboard.press('Enter')
    await (
      await chooser
    ).setFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('') })
    await expect(upload.locator('span.input')).toHaveText('cv.pdf')
  })

  test('gives every input a visible label that wraps, and takes paste', async ({
    browserName,
    context,
    page,
  }) => {
    test.skip(browserName !== 'chromium', 'The clipboard is granted in Chromium.')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/catalogue/inputs')

    const unnamed = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'main :is(input, select, textarea, [role="slider"])',
        ),
      ]
        .filter((control) => {
          const by = control.getAttribute('aria-labelledby')?.split(' ') ?? []
          const labels = [
            ...((control as HTMLInputElement).labels ?? []),
            ...by.map((id) => document.getElementById(id)),
          ]
          return !labels.some((label) => label?.checkVisibility() && label.textContent?.trim())
        })
        .map((control) => control.outerHTML),
    )
    expect(unnamed).toEqual([])

    // A long label wraps beside its value, and nothing of it is cut.
    const label = (await field(page, 'Filled').locator('.row__label').elementHandle())!
    // Changed only once React has taken the page over, so hydration finds what the server sent.
    await expect
      .poll(() =>
        label.evaluate((label) => Object.keys(label).some((key) => key.startsWith('__react'))),
      )
      .toBe(true)
    await label.evaluate((label) => {
      label.firstElementChild!.textContent = 'A label long enough to run onto a second line'
    })
    expect((await label.boundingBox())!.height).toBeGreaterThan(24)
    expect(await label.evaluate((label) => label.scrollWidth <= label.clientWidth)).toBe(true)

    await page.evaluate(() => navigator.clipboard.writeText('pasted'))
    for (const control of [
      field(page, 'Text').locator('input'),
      field(page, 'Email').locator('input'),
      field(page, 'Text area').locator('textarea'),
    ]) {
      await control.fill('')
      await control.focus()
      await page.keyboard.press('ControlOrMeta+V')
      await expect(control).toHaveValue('pasted')
    }
  })
})
