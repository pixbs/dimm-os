import type { Page } from '@playwright/test'

import { expect, test } from './test'

// The system faces the browser draws a name in Latin Extended with, set in one of the page's families.
async function faces(page: Page, family: string) {
  await page.evaluate(async (family) => {
    const name = document.createElement('p')
    name.id = 'extended'
    name.textContent = 'Łukasz Şahin Đorđević'
    name.style.fontFamily = family
    document.body.append(name)
    await document.fonts.load(`16px ${getComputedStyle(name).fontFamily}`, name.textContent)
  }, family)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '#extended',
  })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  await page.evaluate(() => document.getElementById('extended')!.remove())
  expect(fonts.length).toBeGreaterThan(0)
  return fonts.filter((font) => !font.isCustomFont).map((font) => font.familyName)
}

test.describe('Fonts', () => {
  test('the site draws Latin Extended letters in its own typefaces', async ({ page }) => {
    await page.goto('/')
    for (const family of ['var(--font-sans)', 'var(--font-mono)'])
      expect(await faces(page, family)).toEqual([])
  })

  test('the admin draws Latin Extended letters in its own typefaces', async ({ page }) => {
    await page.goto('/admin/login')
    for (const family of ['var(--font-family-sans)', 'var(--font-family-mono)'])
      expect(await faces(page, family)).toEqual([])
  })
})
