import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { file } from '../fixtures/neutral'

let payload: Payload

const words = { en: 'Media, a picture', de: 'Media, ein Bild' }
const trusted = { depth: 0, fallbackLocale: false, overrideAccess: true } as const

const clear = () =>
  payload.delete({
    collection: 'media',
    locale: 'en',
    where: { alt: { equals: words.en } },
    ...trusted,
  })

const read = async (id: number, locale: 'en' | 'de') =>
  (await payload.findByID({ collection: 'media', id, locale, ...trusted })).alt

describe('a picture', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    await clear()
  })

  afterAll(clear)

  it('saves its German words alone and finds the English as they were', async () => {
    const { id } = await payload.create({
      collection: 'media',
      data: { alt: words.en },
      filePath: file,
      locale: 'en',
      ...trusted,
    })
    await payload.update({
      collection: 'media',
      id,
      data: { alt: words.de },
      locale: 'de',
      ...trusted,
    })

    expect(await read(id, 'de')).toBe(words.de)
    expect(await read(id, 'en')).toBe(words.en)
  })

  it('needs its words in English, and none in German', async () => {
    const without = (locale: 'en' | 'de') =>
      payload.create({ collection: 'media', data: {}, filePath: file, locale, ...trusted })

    await expect(without('en')).rejects.toThrow('Alt')
    const { id } = await without('de')
    await payload.delete({ collection: 'media', id, ...trusted })
  })
})
