import config from '@payload-config'
import { getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getGuestAddresses, getWindowView, type Meta, type View } from '@/data/views'
import type { Media, Window } from '@/payload-types'
import { systemWindows } from '@/system/windows'

import { fill } from '../fixtures/neutral'

let payload: Payload
let ids: Record<string, number>
let picture: Media

const languages = ['en', 'de'] as const
const email = 'seo@example.com'
const key = { Authorization: 'users API-Key a-local-api-key-for-the-seo-tests' }
const trusted = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const
const empty = { title: null, description: null, image: null }
const written = { title: 'Written for search', description: 'A description written for search.' }

async function view(path: string, language: 'en' | 'de') {
  const found = await getWindowView(path, language, null)
  expect(found, path).not.toBeNull()
  return found as View
}

// What a search engine and a shared link see at a path: a window's, or at / the desk's.
const meta = async (path: string, language: 'en' | 'de') => {
  const { window, meta } = await view(path, language)
  return (window ? window.meta : meta) as Meta
}

// One press of Auto-generate, sent as the SEO tab sends it.
const generate = async (part: string, body: object) => {
  const response = await handleEndpoints({
    config,
    request: new Request(`http://localhost:3000/api/plugin-seo/generate-${part}`, {
      method: 'POST',
      headers: { ...key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })
  expect(response.status, part).toBe(200)
  return (await response.json()).result
}

const writeWindow = (language: 'en' | 'de', data: Window['meta']) =>
  payload.update({
    collection: 'windows',
    id: ids.grow,
    data: { meta: data, _status: 'published' } as Window,
    locale: language,
    ...trusted,
  })
const writeSite = (language: 'en' | 'de', data: Window['meta']) =>
  payload.updateGlobal({
    slug: 'site',
    data: { meta: data },
    // Its relations are checked against what a guest may read, as the site reads them.
    context: { viewer: null },
    locale: language,
    ...trusted,
  })

beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.delete({
    collection: 'users',
    overrideAccess: true,
    where: { email: { equals: email } },
  })
  ids = await fill(payload)
  await payload.create({
    collection: 'users',
    data: {
      email,
      password: 'a-local-password',
      role: 'content',
      apiKey: key.Authorization.split(' ')[2],
    },
    ...trusted,
    locale: 'en',
  })
  const { docs } = await payload.find({
    collection: 'media',
    limit: 1,
    where: { alt: { equals: 'A sun drawn in dots' } },
    ...trusted,
    locale: 'en',
  })
  picture = docs[0]
})

afterAll(async () => {
  for (const language of languages) {
    await writeWindow(language, empty)
    await writeSite(language, empty)
  }
  await payload.delete({
    collection: 'users',
    overrideAccess: true,
    where: { email: { equals: email } },
  })
})

describe('the SEO tab of a window', () => {
  it('stands in its title, description and picture in that language only, and cleared gives back the earlier', async () => {
    const before = { en: await meta('/work/grow', 'en'), de: await meta('/work/grow', 'de') }

    await writeWindow('en', { ...written, image: picture.id })
    expect(await meta('/work/grow', 'en')).toEqual({
      ...written,
      image: {
        url: picture.variants?.share?.url,
        width: 1200,
        height: 630,
        alt: 'A sun drawn in dots',
      },
    })
    expect(await meta('/work/grow', 'de')).toEqual(before.de)

    await writeWindow('en', empty)
    expect(await meta('/work/grow', 'en')).toEqual(before.en)
  })

  it('generates what the page of each window written in that language shows, and its address', async () => {
    const { en, de } = await getGuestAddresses()
    for (const [language, paths] of [
      ['en', en],
      ['de', de],
    ] as const) {
      const own = paths.filter((path) => path.split('/').pop()! in ids && !(path in systemWindows))
      expect(own.length).toBeGreaterThan(5)
      for (const path of own) {
        const { window } = await view(path, language)
        if (window?.lang) continue
        const id = ids[path.split('/').pop()!]
        // The tab's form holds the document as saved, its relations as ids.
        const doc = await payload.findByID({
          collection: 'windows',
          id,
          ...trusted,
          draft: true,
          locale: language,
        })
        const body = { id, collectionSlug: 'windows', doc, locale: language }
        const image = await payload.findByID({
          collection: 'media',
          id: await generate('image', body),
          ...trusted,
          locale: language,
        })

        expect(await generate('title', body), path).toBe(window?.meta?.title)
        expect(await generate('description', body), path).toBe(window?.meta?.description)
        expect(image.variants?.share?.url, path).toBe(window?.meta?.image?.url)
        expect(await generate('url', body), path).toBe(
          `http://localhost:3000${language === 'en' ? '' : '/de'}${path}`,
        )
      }
    }
  })
})

describe('the SEO group of Site', () => {
  it('stands in the title, description and picture of the desk at /, in that language only', async () => {
    // With nothing written the desk has its card alone.
    const before = { en: await meta('/', 'en'), de: await meta('/', 'de') }
    expect(before.en).toEqual({ ...empty, image: expect.objectContaining({ alt: 'Dimm OS' }) })

    await writeSite('en', { ...written, image: picture.id })
    expect(await meta('/', 'en')).toMatchObject({
      ...written,
      image: { url: picture.variants?.share?.url, width: 1200, height: 630 },
    })
    expect(await meta('/', 'de')).toEqual(before.de)

    await writeSite('en', empty)
    expect(await meta('/', 'en')).toEqual(before.en)
  })

  it('generates what the desk shows, no words beside the site name, its card and its address', async () => {
    for (const language of languages) {
      const doc = await payload.findGlobal({ slug: 'site', ...trusted, locale: language })
      const body = { globalSlug: 'site', doc, locale: language }
      expect(await generate('title', body)).toBe('')
      expect(await generate('description', body)).toBe('')
      expect(doc.meta?.image).toEqual(expect.any(Number))
      expect(await generate('image', body)).toBe(doc.meta?.image)
      expect(await generate('url', body)).toBe(
        `http://localhost:3000/${language === 'en' ? '' : 'de'}`,
      )
    }
  })
})
