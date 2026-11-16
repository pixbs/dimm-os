import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { User, Window } from '@/payload-types'

let payload: Payload

const slugs = [
  'alone',
  'bilingual',
  'imprint',
  'privacy-policy',
  'ordinary',
  'parent',
  'item',
  'other',
]
const signedIn: User = {
  id: 0,
  collection: 'users',
  email: 'admin@example.com',
  role: 'admin',
  createdAt: '',
  updatedAt: '',
}

type Data = Partial<Window>

const create = (data: Data & Pick<Window, 'title'>, locale: 'en' | 'de' = 'en') =>
  payload.create({
    collection: 'windows',
    // The slug fills itself, though the generated type asks for one.
    data: { _status: 'published', ...data } as Window,
    depth: 0,
    draft: false,
    fallbackLocale: false,
    locale,
    overrideAccess: true,
  })

const read = (id: number, locale: 'en' | 'de', draft: boolean) =>
  payload.findByID({
    collection: 'windows',
    id,
    depth: 0,
    draft,
    fallbackLocale: false,
    locale,
    overrideAccess: true,
  })

describe('a window', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    await payload.delete({
      collection: 'windows',
      depth: 0,
      locale: 'en',
      overrideAccess: true,
      where: { slug: { in: slugs } },
    })
  })

  it('is valid with a title alone', async () => {
    const window = await create({ title: 'Alone' })

    expect(window).toMatchObject({ slug: 'alone', _status: 'published' })
  })

  it('publishes German alone and finds English as it was', async () => {
    const english = {
      title: 'Bilingual',
      actions: [{ type: 'address' as const, url: '/en', label: 'Read' }],
    }
    const { id } = await create(english)
    await payload.update({
      collection: 'windows',
      id,
      data: {
        title: 'Bilingual, changed',
        actions: [{ type: 'address', url: '/en', label: 'Read on' }],
      },
      depth: 0,
      draft: true,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: true,
    })
    await payload.update({
      collection: 'windows',
      id,
      data: {
        title: 'Zweisprachig',
        actions: [{ type: 'address', url: '/de', label: 'Lesen' }],
        _status: 'published',
      },
      depth: 0,
      draft: false,
      fallbackLocale: false,
      locale: 'de',
      overrideAccess: true,
    })

    expect(await read(id, 'en', false)).toMatchObject({
      ...english,
      actions: [english.actions[0]],
      _status: 'published',
    })
    expect(await read(id, 'en', true)).toMatchObject({
      title: 'Bilingual, changed',
      actions: [{ label: 'Read on' }],
    })
    expect(await read(id, 'de', false)).toMatchObject({
      title: 'Zweisprachig',
      actions: [{ label: 'Lesen' }],
      _status: 'published',
    })
  })

  it.each([
    ...['preferences', 'hotkeys', 'about', 'accessibility', 'cookies'],
    ...['en', 'de'],
    ...['login', 'admin', 'api', 'licenses', 'view'],
  ])('may not take the slug %s', async (slug) => {
    await expect(create({ title: 'Reserved', slug })).rejects.toThrow('Slug')
    // Nor from its title.
    await expect(create({ title: slug })).rejects.toThrow('Slug')
  })

  it('is a window or the item of one, no deeper', async () => {
    const parent = await create({ title: 'Parent' })
    const item = await create({ title: 'Item', parent: parent.id })

    const other = await create({ title: 'Other' })

    await expect(create({ title: 'Deeper', parent: item.id })).rejects.toThrow('Parent')
    await expect(
      payload.update({
        collection: 'windows',
        id: parent.id,
        data: { parent: other.id },
        depth: 0,
        draft: false,
        fallbackLocale: false,
        locale: 'en',
        overrideAccess: true,
      }),
    ).rejects.toThrow('Parent')
  })
})

describe('the two legal windows', () => {
  const change = (id: number, data: Data, options: { unpublishAllLocales?: boolean } = {}) =>
    payload.update({
      collection: 'windows',
      id,
      data,
      depth: 0,
      draft: false,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: true,
      ...options,
    })
  const remove = (id: number) =>
    payload.delete({
      collection: 'windows',
      id,
      depth: 0,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      user: signedIn,
    })

  it.each(['imprint', 'privacy-policy'])(
    'cannot be hidden, deleted or unpublished: %s',
    async (slug) => {
      const { id } = await create({ title: slug, slug })

      await expect(change(id, { hidden: true })).rejects.toThrow('Hidden')
      await expect(change(id, { _status: 'draft' })).rejects.toThrow('stay published')
      await expect(change(id, {}, { unpublishAllLocales: true })).rejects.toThrow('stay published')
      await expect(remove(id)).rejects.toThrow()
      const window = await read(id, 'en', false)
      expect(window.hidden).toBeFalsy()
      expect(window._status).toBe('published')
    },
  )

  it('leave an ordinary window free to be hidden, unpublished and deleted', async () => {
    const { id } = await create({ title: 'Ordinary' })

    expect(await change(id, { hidden: true })).toMatchObject({ hidden: true })
    expect(await change(id, { _status: 'draft' })).toMatchObject({ _status: 'draft' })
    await remove(id)
    await expect(read(id, 'en', true)).rejects.toThrow()
  })
})
