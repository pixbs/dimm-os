import type { Locator, Page } from '@playwright/test'

import { login } from './login'
import { expect, test } from './test'

const origin = 'http://localhost:3000'
const written = { title: 'Written for search', description: 'A description written for search.' }
const cleared = { title: null, description: null, image: null }

// What a search engine and a shared link read of a page, as the server sends it.
async function head(page: Page, path: string) {
  const html = await (await page.request.get(path)).text()
  const meta = (name: string) =>
    html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1] ?? null
  return {
    title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null,
    description: meta('description'),
    og: {
      title: meta('og:title'),
      description: meta('og:description'),
      image: meta('og:image'),
      alt: meta('og:image:alt'),
    },
    twitter: meta('twitter:card'),
  }
}

// The card the image field of a window holds in a language.
async function card(page: Page, id: number, language = 'en') {
  const response = await page.request.get(`/api/windows/${id}?locale=${language}&depth=1`)
  const { image } = (await response.json()).meta
  return {
    filename: image.filename as string,
    share: image.variants.share.url as string,
    size: [image.width, image.height],
  }
}

// A picture of the fixture, by its words.
async function picture(page: Page, alt: string) {
  const response = await page.request.get(
    `/api/media?where[alt][equals]=${encodeURIComponent(alt)}&depth=0&limit=1&locale=en`,
  )
  const [doc] = (await response.json()).docs
  return {
    id: doc.id as number,
    filename: doc.filename as string,
    share: doc.variants.share.url as string,
  }
}

// The overview, which counts the card as its picture, the title, the description, the picture and the search preview.
async function fiveParts(scope: Locator) {
  await expect(scope.getByText('1/3 checks are passing')).toBeVisible()
  for (const part of ['title', 'description', 'image'])
    await expect(scope.locator(`#field-meta__${part}`)).toBeVisible()
  await expect(scope.getByText('Exact result listings may vary')).toBeVisible()
}

// A click before the admin has started is lost, so the tab is chosen until it shows.
async function openTab(page: Page, name: string) {
  const tab = page.getByRole('tab', { name, exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 })
  }).toPass()
}

async function toGerman(page: Page) {
  await page.getByRole('button', { name: 'Locale: English (en)' }).click()
  await page.getByText('Deutsch (de)').click()
  await page.waitForURL(/locale=de/)
}

test.describe('The SEO tab', () => {
  const made: number[] = []
  const stamp = Date.now().toString(36)
  const slug = `seo-${stamp}`

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    for (const id of made.splice(0)) await page.request.delete(`/api/windows/${id}`)
    await page.request.post('/api/globals/site?locale=en', { data: { meta: cleared } })
    // The admin opens in the language it last showed, and the tests after these expect English.
    await page.request.post('/api/payload-preferences/locale', { data: { value: 'en' } })
  })

  // A window written in both languages, with a Header and a cover and no Listing words.
  async function window(page: Page) {
    const cover = await picture(page, 'A sun setting over two hills')
    const header = (title: string, text: string) => [{ blockType: 'header', title, text }]
    const response = await page.request.post('/api/windows?locale=en', {
      data: {
        title: `SEO ${stamp}`,
        slug,
        cover: cover.id,
        sections: header('A heading of the window', 'One sentence under the heading.'),
        _status: 'published',
      },
    })
    const { id } = (await response.json()).doc
    made.push(id)
    await page.request.patch(`/api/windows/${id}?locale=de`, {
      data: {
        title: `SEO ${stamp}`,
        sections: header('Eine Überschrift des Fensters', 'Ein Satz unter der Überschrift.'),
        _status: 'published',
      },
    })
    return { id: id as number, cover }
  }

  test('holds the card of a published window without a picture, which the page shares large and the list of Media leaves out', async ({
    page,
  }) => {
    const response = await page.request.post('/api/windows?locale=en', {
      data: {
        title: `SEO ${stamp}`,
        slug,
        description: 'Words of the card.',
        _status: 'published',
      },
    })
    const { id } = (await response.json()).doc
    made.push(id)
    const drawn = await card(page, id)
    expect(drawn.size).toEqual([1200, 630])
    expect(await head(page, `/${slug}`)).toMatchObject({
      og: { image: `${origin}${drawn.share}`, alt: `SEO ${stamp}` },
      twitter: 'summary_large_image',
    })

    await page.goto('/admin/collections/media?limit=100')
    const list = page.locator('.collection-list')
    await expect(list.getByText('picture.jpg', { exact: true })).toBeVisible()
    await expect(list.getByText(/card-/)).toHaveCount(0)
  })

  test("of a window shows the five parts, generates what the page showed and previews the window's address", async ({
    page,
  }) => {
    const { id, cover } = await window(page)
    const before = await head(page, `/${slug}`)

    // The tabs open where the editor left them, which the admin reads once it has started.
    const restored = page.waitForResponse((response) =>
      response.url().includes(`/payload-preferences/collection-windows-${id}`),
    )
    await page.goto(`/admin/collections/windows/${id}?locale=en`)
    await restored
    await openTab(page, 'SEO')
    await fiveParts(page.locator('.tabs-field__content-wrap'))
    // The preview asks for its address once the tab runs, so the buttons answer from then on.
    await expect(page.getByText(`${origin}/${slug}`, { exact: true })).toBeVisible()
    const generate = page.getByRole('button', { name: 'Auto-generate' })
    await generate.nth(0).click()
    await expect(page.locator('#field-meta__title')).toHaveValue(
      before.title!.replace(' · Dimm OS', ''),
    )
    await generate.nth(1).click()
    await expect(page.locator('#field-meta__description')).toHaveValue(before.description!)
    // The picture is the card drawn at the publish, which shows the cover in its window.
    const drawn = await card(page, id)
    expect(drawn.filename).not.toBe(cover.filename)
    await generate.nth(2).click()
    await expect(page.locator('#field-meta__image')).toContainText(drawn.filename)
    expect(before.og.image).toBe(`${origin}${drawn.share}`)

    await toGerman(page)
    await openTab(page, 'SEO')
    await expect(page.getByText(`${origin}/de/${slug}`, { exact: true })).toBeVisible()
  })

  test("of Site shows the five parts, generates what the desk showed and previews the desk's address", async ({
    page,
  }) => {
    await page.goto('/admin/globals/site?locale=en')
    const group = page.locator('#field-meta')
    await group.scrollIntoViewIfNeeded()
    await fiveParts(group)
    await expect(group.getByText(`${origin}/`, { exact: true })).toBeVisible()

    await toGerman(page)
    await group.scrollIntoViewIfNeeded()
    await expect(group.getByText(`${origin}/de`, { exact: true })).toBeVisible()
    // The desk shows no words beside the site's name.
    await page.locator('#field-meta__title').fill('Words')
    await page.locator('#field-meta__description').fill('Words')
    await group.getByRole('button', { name: 'Auto-generate' }).nth(0).click()
    await group.getByRole('button', { name: 'Auto-generate' }).nth(1).click()
    await expect(page.locator('#field-meta__title')).toHaveValue('')
    await expect(page.locator('#field-meta__description')).toHaveValue('')
  })

  test('stands in the title, description and og: tags in its language only, and cleared gives back the earlier', async ({
    page,
  }) => {
    const { id } = await window(page)
    const shared = await picture(page, 'A sun drawn in dots')
    const meta = { ...written, image: shared.id }
    const after = {
      title: `${written.title} · Dimm OS`,
      description: written.description,
      og: { ...written, image: `${origin}${shared.share}`, alt: 'A sun drawn in dots' },
      twitter: 'summary_large_image',
    }

    // A window saves by PATCH and publishes per language; Site saves by POST.
    const writes = [
      [
        `/${slug}`,
        `/de/${slug}`,
        (data: object) =>
          page.request.patch(`/api/windows/${id}?locale=en`, {
            data: { ...data, _status: 'published' },
          }),
      ],
      ['/', '/de', (data: object) => page.request.post('/api/globals/site?locale=en', { data })],
    ] as const
    for (const [path, german, write] of writes) {
      const before = { en: await head(page, path), de: await head(page, german) }
      expect((await write({ meta })).ok(), path).toBe(true)
      expect(await head(page, path), path).toEqual(after)
      expect(await head(page, german), path).toEqual(before.de)

      expect((await write({ meta: cleared })).ok(), path).toBe(true)
      expect(await head(page, path), path).toEqual(before.en)
    }
  })
})
