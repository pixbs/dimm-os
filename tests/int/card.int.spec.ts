import config from '@payload-config'
import { getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { getWindowView, type View } from '@/data/views'
import type { Visitor, Window } from '@/payload-types'

import { file } from '../fixtures/neutral'

// What ImageResponse is asked to draw, and whether it draws at all.
const og = vi.hoisted(() => ({ fails: false, drawn: [] as string[] }))
vi.mock('next/og', async (original) => {
  const { ImageResponse } = await original<typeof import('next/og')>()
  return {
    ImageResponse: class extends ImageResponse {
      constructor(...args: ConstructorParameters<typeof ImageResponse>) {
        if (og.fails) throw new Error('No drawing in this test.')
        og.drawn.push(JSON.stringify(args[0]))
        super(...args)
      }
    },
  }
})

let payload: Payload
let id: number

const email = 'card@example.com'
const key = { Authorization: 'users API-Key a-local-api-key-for-the-card-tests' }
const chosen = 'Card, chosen by hand'
const trusted = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const

const make = (slug: string, data: Partial<Window>) =>
  payload.create({
    collection: 'windows',
    data: { title: 'Card', slug, _status: 'published', ...data } as Window,
    locale: 'en',
    ...trusted,
  })
const publish = (locale: 'en' | 'de', data: Partial<Window> = {}) =>
  payload.update({
    collection: 'windows',
    id,
    data: { ...data, _status: 'published' } as Window,
    locale,
    ...trusted,
  })
const held = async (window: number, locale: 'en' | 'de') =>
  (await payload.findByID({ collection: 'windows', id: window, locale, ...trusted, draft: true }))
    .meta?.image as number | null | undefined
const media = (window: number, locale: 'en' | 'de') =>
  payload.findByID({ collection: 'media', id: window, locale, ...trusted })
// Every card drawn for a window, in whatever language.
const cards = async (window: number) =>
  (
    await payload.find({
      collection: 'media',
      locale: 'en',
      pagination: false,
      where: { and: [{ 'drawn.of': { equals: 'windows' } }, { 'drawn.id': { equals: window } }] },
      ...trusted,
    })
  ).docs

const clear = async () => {
  await payload.delete({
    collection: 'windows',
    locale: 'en',
    where: { slug: { like: 'card-' } },
    ...trusted,
  })
  await payload.delete({
    collection: 'media',
    locale: 'en',
    where: { alt: { equals: chosen } },
    ...trusted,
  })
  await payload.delete({
    collection: 'users',
    overrideAccess: true,
    where: { email: { equals: email } },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await clear()
  id = (await make('card-words', { description: 'Words of the card.' })).id
})

afterAll(clear)

describe('the card of a window', () => {
  it('fills the image field of the language published with a picture of 1200 × 630, which the page shares', async () => {
    const card = await media((await held(id, 'en'))!, 'en')
    expect(card).toMatchObject({ alt: 'Card', mimeType: 'image/png', width: 1200, height: 630 })
    expect(og.drawn.at(-1)).toContain('Words of the card.')
    expect(await held(id, 'de')).toBeFalsy()

    const { window } = (await getWindowView('/card-words', 'en', null)) as View
    expect(window?.meta?.image).toEqual({
      url: card.variants?.share?.url,
      width: 1200,
      height: 630,
      alt: 'Card',
    })
  })

  it('is drawn again into its own document when the title changes, and not when nothing does', async () => {
    const first = await held(id, 'en')
    const drawn = og.drawn.length
    await publish('en')
    expect(og.drawn).toHaveLength(drawn)

    await publish('en', { title: 'Another' })
    expect(await held(id, 'en')).toBe(first)
    expect(await cards(id)).toMatchObject([{ id: first, alt: 'Another' }])
    expect(og.drawn.at(-1)).toContain('Another')
  })

  it('shows the German title in German, in a card of its own', async () => {
    await publish('de', { title: 'Karte', description: 'Worte der Karte.' })
    const german = (await held(id, 'de'))!
    expect(german).not.toBe(await held(id, 'en'))
    expect(await media(german, 'de')).toMatchObject({ alt: 'Karte', width: 1200, height: 630 })
    expect(og.drawn.at(-1)).toContain('Karte')
    expect(og.drawn.at(-1)).not.toContain('Another')
  })

  it('leaves a picture chosen by hand through every publish', async () => {
    const picture = await payload.create({
      collection: 'media',
      data: { alt: chosen },
      filePath: file,
      locale: 'en',
      ...trusted,
    })
    await publish('en', { meta: { image: picture.id } })
    await publish('en', { title: 'Third' })
    await publish('en')
    expect(await held(id, 'en')).toBe(picture.id)
    expect(await media(picture.id, 'en')).toMatchObject({ alt: chosen, filename: picture.filename })
  })

  it('is not drawn for a draft', async () => {
    const draft = await payload.create({
      collection: 'windows',
      data: { title: 'Draft', slug: 'card-draft' } as Window,
      locale: 'en',
      ...trusted,
      draft: true,
    })
    expect(await held(draft.id, 'en')).toBeFalsy()
    expect(await cards(draft.id)).toEqual([])
  })

  it('fails no publish when the drawing fails', async () => {
    og.fails = true
    try {
      const made = await make('card-fails', {})
      expect(made._status).toBe('published')
      expect(await held(made.id, 'en')).toBeFalsy()
    } finally {
      og.fails = false
    }
  })

  it('is drawn for a window written and published through the MCP', async () => {
    await payload.create({
      collection: 'users',
      data: {
        email,
        password: 'a-local-password',
        role: 'content',
        apiKey: key.Authorization.split(' ')[2],
      },
      locale: 'en',
      ...trusted,
    })
    const response = await handleEndpoints({
      config,
      request: new Request('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: {
          ...key,
          Accept: 'application/json, text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'createDocuments',
            arguments: {
              slug: 'windows',
              locale: 'en',
              documents: [{ data: { title: 'By MCP', slug: 'card-mcp', _status: 'published' } }],
            },
          },
        }),
      }),
    })
    expect((await response.json()).result?.isError).toBe(false)

    const { docs } = await payload.find({
      collection: 'windows',
      locale: 'en',
      where: { slug: { equals: 'card-mcp' } },
      ...trusted,
    })
    expect(await media(docs[0].meta?.image as number, 'en')).toMatchObject({ alt: 'By MCP' })
  })

  it('of a hidden window is named only to a viewer who may see the window', async () => {
    const hidden = await make('card-hidden', { hidden: true })
    const card = await media((await held(hidden.id, 'en'))!, 'en')
    const invited = { windows: [hidden.id], expires: '2999-01-01' } as Visitor

    expect(await getWindowView('/card-hidden', 'en', null)).toBeNull()
    const seen = (await getWindowView('/card-hidden', 'en', invited)) as View
    expect(seen.window?.meta?.image?.url).toBe(card.variants?.share?.url)
  })

  it('is deleted with its window, in every language', async () => {
    expect(await cards(id)).toHaveLength(2)
    await payload.delete({ collection: 'windows', id, locale: 'en', ...trusted })
    expect(await cards(id)).toEqual([])
  })
})
