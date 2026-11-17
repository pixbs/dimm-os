import type { Page } from '@playwright/test'

import { login } from './login'
import { expect, test } from './test'

// Autosave gives a new window its address at once.
async function newWindow(page: Page, title: string): Promise<number> {
  await page.goto('/admin/collections/windows/create')
  await page.waitForURL(/\/admin\/collections\/windows\/\d+/)
  await page.fill('#field-title', title)
  return Number(page.url().match(/windows\/(\d+)/)![1])
}

async function publish(page: Page, language: string) {
  await page.getByRole('button', { name: `Publish in ${language}` }).click()
  await expect(page.getByText('Updated successfully.')).toBeVisible()
}

test.describe('A window in the admin', () => {
  const made: number[] = []
  const stamp = Date.now().toString(36)

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    for (const id of made.splice(0)) await page.request.delete(`/api/windows/${id}`)
  })

  test('is made with a title alone, given a parent, ordered by dragging and written in German', async ({
    page,
  }) => {
    const parent = await newWindow(page, `Parent ${stamp}`)
    made.push(parent)
    await publish(page, 'English')

    const item = await newWindow(page, `Item ${stamp}`)
    made.push(item)
    await page.locator('#field-parent').click()
    await page.keyboard.type(`Parent ${stamp}`)
    await page.getByRole('option', { name: `Parent ${stamp}` }).click()
    await publish(page, 'English')

    // The item, made last, is dragged above its parent.
    await page.goto(`/admin/collections/windows?sort=_order&search=${stamp}`)
    const handle = (title: string) =>
      page
        .locator('tbody tr', { has: page.getByRole('link', { name: title, exact: true }) })
        .getByRole('button', { name: 'Drag to move' })
    const from = (await handle(`Item ${stamp}`).boundingBox())!
    const to = (await handle(`Parent ${stamp}`).boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2, from.y - 5, { steps: 5 })
    await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 15 })
    const reordered = page.waitForResponse((response) => response.url().includes('/reorder'))
    await page.mouse.up()
    expect((await reordered).ok()).toBe(true)
    await page.reload()
    await expect(page.locator('tbody td.cell-title')).toHaveText([
      `Item ${stamp}`,
      `Parent ${stamp}`,
    ])

    await page.goto(`/admin/collections/windows/${parent}`)
    await page.getByRole('button', { name: 'Locale: English (en)' }).click()
    await page.getByText('Deutsch (de)').click()
    await page.waitForURL(/locale=de/)
    await expect(page.locator('#field-title')).toHaveValue('')
    await page.fill('#field-title', `Eltern ${stamp}`)
    await publish(page, 'Deutsch')

    await page.goto(`/admin/collections/windows/${parent}?locale=en`)
    await expect(page.locator('#field-title')).toHaveValue(`Parent ${stamp}`)
  })

  test('offers its sections in the block picker, each with its preview', async ({ page }) => {
    const response = await page.request.post('/api/windows?locale=en', {
      data: { title: `Sections ${stamp}` },
    })
    const { doc } = await response.json()
    made.push(doc.id)

    await page.goto(`/admin/collections/windows/${doc.id}`)
    await page.getByRole('tab', { name: 'Sections', exact: true }).click()
    await page.getByRole('button', { name: 'Add Section' }).click()
    for (const name of ['Header', 'Text']) {
      await expect(
        page.getByRole('img', { name: `Preview of the ${name} section` }),
      ).toHaveAttribute('src', `/block-previews/${name.toLowerCase()}.png`)
    }
  })

  test('hides on an item the fields that do not apply to it', async ({ page }) => {
    const create = async (data: object) => {
      const response = await page.request.post('/api/windows?locale=en', { data })
      const { doc } = await response.json()
      made.push(doc.id)
      return doc.id as number
    }
    const parent = await create({ title: `Window ${stamp}` })
    const item = await create({ title: `Row ${stamp}`, parent })

    const windowOnly = ['Width in pixels', 'Height in pixels', 'One size', 'Open at start']
    const itemOnly = ['Caption', 'Headline', 'Note', 'Facts', 'Related']
    const labels = async (tab: string) => {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      return page.locator('.field-label, label').allInnerTexts()
    }
    const shown = (all: string[], name: string) => all.some((label) => label.startsWith(name))

    await page.goto(`/admin/collections/windows/${item}`)
    const onItem = [...(await labels('Window')), ...(await labels('Listing'))]
    for (const name of windowOnly) expect(shown(onItem, name), name).toBe(false)
    for (const name of itemOnly) expect(shown(onItem, name), name).toBe(true)

    await page.goto(`/admin/collections/windows/${parent}`)
    const onWindow = [...(await labels('Window')), ...(await labels('Listing'))]
    for (const name of windowOnly) expect(shown(onWindow, name), name).toBe(true)
    for (const name of itemOnly) expect(shown(onWindow, name), name).toBe(false)
  })
})
