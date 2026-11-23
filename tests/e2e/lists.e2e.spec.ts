import type { Locator, Page } from '@playwright/test'

import { expect, test } from './test'

// The fixture's lists: Services opens with an index; the CV holds headed groups; Grow steps with a meter each; Field its
// neighbours by picture, steps, rows that open, a foot and an empty list.
const win = (page: Page, slug: string) => page.locator(`#window-${slug}`)
const section = (window: Locator, heading: string) =>
  window.locator('section', {
    has: window.page().getByRole('heading', { name: heading, exact: true }),
  })
const box = async (part: Locator) => (await part.boundingBox())!
const style = (part: Locator, property: string) =>
  part.evaluate(
    (element, property) => getComputedStyle(element).getPropertyValue(property),
    property,
  )

// How each row of the first list arrives: its turn and what it plays.
const arrivals = (page: Page) =>
  page.evaluate(() => {
    const seen: { delay: string; name: string }[] = []
    ;(window as unknown as { arrived: typeof seen }).arrived = seen
    new MutationObserver((records) => {
      for (const { target } of records) {
        const row = target as HTMLElement
        if (row.dataset.enter !== 'in' || !row.matches('#window-services .list > .row')) continue
        const { animationDelay: delay, animationName: name } = getComputedStyle(row)
        seen.push({ delay, name })
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-enter'], subtree: true })
  })
const arrived = (page: Page) =>
  page.evaluate(() => (window as unknown as { arrived: { delay: string; name: string }[] }).arrived)

test.describe('Lists', () => {
  test('lead with an index beside a name at the heading scale, and fold the name above in a compact window', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/services')
    const rows = win(page, 'services').locator('.list').first().locator('.row')
    const first = rows.first()

    await expect(rows).toHaveCount(3)
    await expect(first).toHaveAttribute('href', '/work')
    await expect(rows.nth(2)).toHaveAttribute('href', 'https://example.com')
    await expect(first.locator('.row__side > .row__index')).toHaveText('01')
    await expect(first.locator('.row__main > .row__title')).toHaveCSS('font-size', '28px')
    await expect(first.locator('.row__main > .row__text')).toHaveText([
      'When it fits, in one sentence.',
      'What it holds, as a list of words',
    ])
    expect((await box(first.locator('.row__main'))).x).toBeGreaterThan(
      (await box(first.locator('.row__side'))).x + (await box(first.locator('.row__side'))).width,
    )

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    const side = await box(first.locator('.row__side'))
    expect(side.y + side.height).toBeLessThanOrEqual((await box(first.locator('.row__main'))).y)
  })

  test('head a group with its title and end label over one line, with none between its rows', async ({
    page,
  }) => {
    await page.goto('/cv')
    const group = win(page, 'cv').locator('.list[data-headed]').first()
    const [head, row] = [group.locator('.list__head'), group.locator('.row').nth(1)]

    // Set in mono in its head, the group's title is still its one heading.
    await expect(
      win(page, 'cv').getByRole('heading', { name: 'A group', exact: true, level: 2 }),
    ).toHaveCount(1)
    await expect(head).toHaveText('A groupKind')
    await expect(row.locator('.row__meta')).toHaveText('A kind')
    // The end label is the size of the end texts, and the head is in mono as they are.
    for (const property of ['font-family', 'font-size'])
      expect(await style(head.locator('.row__title'), property)).toBe(
        await style(row.locator('.row__meta'), property),
      )
    expect(await style(head.locator('.row__meta'), 'font-size')).toBe(
      await style(row.locator('.row__meta'), 'font-size'),
    )
    expect(await style(head, '--row-line')).not.toBe('transparent')
    expect(await style(row, '--row-line')).toBe('transparent')
  })

  test('inset a headed group on the keyline at every size, where a plain list runs past it', async ({
    page,
  }) => {
    // How far a list stands past the content box of what holds it, at its start and at its end.
    const overhang = (list: Locator) =>
      list.evaluate((element) => {
        const [own, parent] = [element, element.parentElement!].map((node) =>
          node.getBoundingClientRect(),
        )
        const { paddingLeft, paddingRight } = getComputedStyle(element.parentElement!)
        return [
          parent.left + parseFloat(paddingLeft) - own.left,
          own.right - (parent.right - parseFloat(paddingRight)),
        ]
      })
    for (const [width, height] of [
      [390, 844],
      [800, 1000],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height })
      await page.goto('/cv')
      const groups = win(page, 'cv').locator('.list[data-headed]')
      await expect(groups.first()).toBeVisible()
      for (const group of await groups.all()) expect(await overhang(group)).toEqual([0, 0])
    }
  })

  test('show a share as dots that read as one, in the language of the page', async ({ page }) => {
    await page.goto('/work/grow')
    const meter = win(page, 'work').getByRole('img', { name: '9 of 12', exact: true })

    await expect(meter.locator('.dot')).toHaveCount(12)
    await expect(meter.locator('.dot:not([data-tone="off"])')).toHaveCount(9)

    await page.goto('/de/work/grow')
    await expect(
      win(page, 'work').getByRole('img', { name: '9 von 12', exact: true }),
    ).toBeVisible()
  })

  test('mark the row of the window they are in, and leave out one the viewer may not see', async ({
    page,
  }) => {
    await page.goto('/work/field')
    const beside = section(win(page, 'work'), 'Beside it')

    await expect(beside.getByRole('link')).toHaveCount(3)
    await expect(beside.getByRole('link', { name: /^Field/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(beside.locator('.row')).toHaveCount(3)
    await expect(beside).not.toContainText('Vault')
    await expect(beside.locator('.row__media img').first()).toHaveAttribute('alt', '')
  })

  test('say in one line that an empty list has nothing yet, and lead on from a foot', async ({
    page,
  }) => {
    await page.goto('/work/field')
    await expect(section(win(page, 'work'), 'Still to come').locator('.message')).toHaveText(
      'Nothing here yet.',
    )
    const foot = section(win(page, 'work'), 'Where it is used').locator('.list__foot')
    await expect(foot.getByRole('link')).toHaveAttribute('href', '/work')
  })

  test('keep their heading above rows that hold a name and an end text, at three columns at most', async ({
    page,
  }) => {
    await page.goto('/work/field')

    await expect(section(win(page, 'work'), 'Where it is used')).toHaveAttribute(
      'data-layout',
      'split',
    )
    await expect(section(win(page, 'work'), 'Three columns')).not.toHaveAttribute('data-layout')
  })

  test('open a row in place and close it again', async ({ page }) => {
    await page.goto('/work/field')
    const questions = section(win(page, 'work'), 'Questions')
    const row = questions.getByRole('button', { name: /^A question that opens\?/ })
    const answer = questions.getByText('Its answer, which shows once the row is open.')

    await expect(row).toHaveAttribute('aria-expanded', 'false')
    await expect(answer).toHaveCount(0)
    await row.click()
    await expect(row).toHaveAttribute('aria-expanded', 'true')
    await expect(answer).toBeVisible()
    await row.click()
    await expect(answer).toHaveCount(0)
  })

  test('bring their rows one after another as a window opens, and keep what the server painted', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work', { waitUntil: 'networkidle' })
    await arrivals(page)
    await page.keyboard.press('s')
    const first = win(page, 'services').locator('.list > .row').first()
    await expect.poll(async () => (await arrived(page)).length).toBeGreaterThan(1)
    const [one, two] = await arrived(page)
    expect(one.name).toBe('arrive')
    // 40 ms after the part before it, in reading order.
    expect(parseFloat(two.delay) - parseFloat(one.delay)).toBeCloseTo(0.04)
    // In place, a row keeps its own transitions.
    await expect(first).not.toHaveAttribute('data-enter')
    await expect(first).toHaveCSS('animation-delay', '0s')

    await page.goto('/services')
    await expect(win(page, 'services').locator('.list > .row')).not.toHaveCount(0)
    await expect(win(page, 'services').locator('.list > [data-enter]')).toHaveCount(0)
  })

  test('bring their rows at once under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/work', { waitUntil: 'networkidle' })
    await arrivals(page)
    await page.keyboard.press('s')

    await expect(win(page, 'services').locator('.list > .row').first()).toBeVisible()
    await expect(win(page, 'services').locator('[data-enter]')).toHaveCount(0)
    expect(await arrived(page)).toEqual([])
  })
})
