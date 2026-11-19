import config from '@payload-config'
import { GRAPHQL_POST } from '@payloadcms/next/routes'
import path from 'path'
import { getPayload, handleEndpoints, type Payload, type Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { ListView } from '@/blocks/list/view'
import { getGuestAddresses, getWindowView, type View } from '@/data/views'
import type { Media, User, Visitor, Window } from '@/payload-types'

import { keepSite } from './site'

let payload: Payload
let restoreSite: Awaited<ReturnType<typeof keepSite>>

const languages = ['en', 'de'] as const
type Language = (typeof languages)[number]

const slugs = [
  'access-work',
  'access-grow',
  'access-vault',
  'access-secret',
  'access-secret-item',
  'access-other-secret',
  'access-unpublished',
] as const
type Slug = (typeof slugs)[number]
const emails = ['access-admin@example.com', 'access-content@example.com']
const names = ['Access, invited', 'Access, expired', 'Access, key', 'Access, other']

const made = {} as Record<Slug, Window>
let picture: Media
let invited: Visitor
let expired: Visitor
const contentKey = 'a-local-api-key-for-the-content-user'
const owner = {
  id: 0,
  collection: 'users',
  email: 'access-owner@example.com',
  role: 'admin',
  createdAt: '',
  updatedAt: '',
} as User

const titles: Record<Slug, Record<Language, string>> = {
  'access-work': { en: 'Work', de: 'Arbeit' },
  'access-grow': { en: 'Grow', de: 'Wachsen' },
  'access-vault': { en: 'Vault', de: 'Tresor' },
  'access-secret': { en: 'Secret', de: 'Geheim' },
  'access-secret-item': { en: 'Secret item', de: 'Geheimes Stück' },
  'access-other-secret': { en: 'Other secret', de: 'Anderes Geheimnis' },
  'access-unpublished': { en: 'Unpublished', de: 'Unveröffentlicht' },
}

// A window published in both languages, unless it is the one left as a draft.
async function make(slug: Slug, data: Partial<Window> = {}) {
  const published = slug !== 'access-unpublished'
  const status = published ? 'published' : 'draft'
  const save = { depth: 0, draft: !published, fallbackLocale: false, overrideAccess: true } as const
  const { id } = await payload.create({
    collection: 'windows',
    data: { title: titles[slug].de, slug, _status: status, ...data } as Window,
    locale: 'de',
    ...save,
  })
  made[slug] = await payload.update({
    collection: 'windows',
    id,
    data: { title: titles[slug].en, _status: status, ...data },
    locale: 'en',
    ...save,
  })
}

// The site's own server code, reading for a guest (null) or a visitor.
const site = (viewer: null | Visitor, locale: Language, depth = 1) =>
  ({
    context: { viewer },
    depth,
    draft: false,
    fallbackLocale: false,
    locale,
    overrideAccess: false,
  }) as const

const ours = { slug: { in: [...slugs] } }

const listed = async (viewer: null | Visitor, locale: Language) => {
  const { docs } = await payload.find({
    collection: 'windows',
    where: ours,
    ...site(viewer, locale),
  })
  return docs.map((doc) => doc.slug).sort()
}

// Payload's public API, as a browser or an agent reaches it.
const rest = (route: string, init?: RequestInit) =>
  handleEndpoints({ config, request: new Request(`http://localhost:3000/api${route}`, init) })

beforeAll(async () => {
  payload = await getPayload({ config })
  restoreSite = await keepSite(payload)
  await payload.delete({
    collection: 'visitors',
    overrideAccess: true,
    where: { name: { in: names } },
  })
  await payload.delete({
    collection: 'windows',
    depth: 0,
    locale: 'en',
    overrideAccess: true,
    where: ours,
  })
  await payload.delete({
    collection: 'media',
    overrideAccess: true,
    where: { alt: { equals: 'Access, a picture' } },
  })
  await payload.delete({
    collection: 'users',
    overrideAccess: true,
    where: { email: { in: emails } },
  })

  picture = await payload.create({
    collection: 'media',
    data: { alt: 'Access, a picture' },
    depth: 0,
    filePath: path.resolve('src/ds/catalogue/picture.jpg'),
    overrideAccess: true,
  })
  await make('access-work')
  await make('access-vault', { parent: made['access-work'].id, hidden: true, cover: picture.id })
  await make('access-grow', {
    parent: made['access-work'].id,
    related: [made['access-vault'].id, made['access-work'].id],
    actions: [{ type: 'window', window: made['access-vault'].id, label: 'Open' }],
  })
  await make('access-secret', { hidden: true, key: 'Q' })
  await make('access-secret-item', {
    parent: made['access-secret'].id,
    related: [made['access-secret'].id],
  })
  await make('access-other-secret', { hidden: true, key: 'X' })
  await make('access-unpublished')
  // The work window lists its own items, filtered by the windows they relate to.
  for (const locale of languages)
    await payload.update({
      collection: 'windows',
      id: made['access-work'].id,
      data: {
        sections: [
          {
            blockType: 'list',
            source: 'window',
            from: made['access-work'].id,
            filter: true,
            lead: 'none',
            rows: 'opens',
          },
        ],
      },
      depth: 0,
      draft: false,
      fallbackLocale: false,
      locale,
      overrideAccess: true,
    })

  const visitor = (name: string, password: string, windows: number[], expires?: string) =>
    payload.create({
      collection: 'visitors',
      data: { name, password, windows, ...(expires ? { expires } : {}) } as Visitor,
      depth: 0,
      overrideAccess: true,
    })
  invited = await visitor('Access, invited', 'an-invitation-to-see-secrets', [
    made['access-secret'].id,
  ])
  expired = await visitor(
    'Access, expired',
    'an-invitation-that-ran-out',
    [made['access-secret'].id, made['access-other-secret'].id],
    new Date(Date.now() - 1000).toISOString(),
  )
})

afterAll(async () => {
  await payload.delete({
    collection: 'visitors',
    overrideAccess: true,
    where: { name: { in: names } },
  })
  await payload.delete({
    collection: 'windows',
    depth: 0,
    locale: 'en',
    overrideAccess: true,
    where: ours,
  })
  await payload.delete({
    collection: 'media',
    overrideAccess: true,
    where: { id: { equals: picture.id } },
  })
  await payload.delete({
    collection: 'users',
    overrideAccess: true,
    where: { email: { in: emails } },
  })
  await restoreSite()
})

describe.each(languages)('as a guest, in %s, a hidden window and its items', (locale) => {
  it('appear in no list or count', async () => {
    expect(await listed(null, locale)).toEqual(['access-grow', 'access-work'])
    const { totalDocs } = await payload.count({
      collection: 'windows',
      where: ours,
      ...site(null, locale),
    })
    expect(totalDocs).toBe(2)
  })

  it('appear in no pager', async () => {
    const page = await payload.find({
      collection: 'windows',
      limit: 1,
      where: { parent: { equals: made['access-work'].id } },
      ...site(null, locale),
    })

    expect(page.docs.map((doc) => doc.slug)).toEqual(['access-grow'])
    expect(page).toMatchObject({ totalDocs: 1, totalPages: 1, hasNextPage: false })
  })

  it('appear in no filter', async () => {
    const found = (where: Where) =>
      payload.count({ collection: 'windows', where: { and: [ours, where] }, ...site(null, locale) })

    expect((await found({ slug: { equals: 'access-vault' } })).totalDocs).toBe(0)
    expect((await found({ title: { like: titles['access-vault'][locale] } })).totalDocs).toBe(0)
    expect((await found({ 'parent.slug': { equals: 'access-secret' } })).totalDocs).toBe(0)
    expect((await found({ hidden: { equals: true } })).totalDocs).toBe(0)
    await expect(
      payload.findByID({
        collection: 'windows',
        id: made['access-vault'].id,
        ...site(null, locale),
      }),
    ).rejects.toThrow()
  })

  it('appear in no row, count or filter of a list of their window', async () => {
    const { window } = (await getWindowView('/access-work', locale, null)) as View
    const [list] = window!.sections as ListView[]

    expect(list.items.map(({ name }) => name)).toEqual([titles['access-grow'][locale]])
    expect(list.filter).toEqual([
      {
        href: locale === 'en' ? '/access-work' : '/de/access-work',
        label: titles['access-work'][locale],
        count: 1,
      },
    ])
    expect(window!.count).toBe(1)
  })

  it('appear in no populated relation, not even as a bare id', async () => {
    const grow = await payload.findByID({
      collection: 'windows',
      id: made['access-grow'].id,
      ...site(null, locale),
    })

    expect((grow.related as Window[]).map((one) => one.slug)).toEqual(['access-work'])
    expect(grow.actions?.[0].window).toBeNull()
    expect((grow.parent as Window).title).toBe(titles['access-work'][locale])
  })

  it('appear in no relation of Site', async () => {
    const counted = async (window: Window) => {
      await payload.updateGlobal({
        slug: 'site',
        data: {
          name: 'A site',
          email: 'site@example.com',
          place: 'Somewhere',
          timezone: 'Europe/London',
          counted: window.id,
        },
        depth: 0,
        draft: false,
        fallbackLocale: false,
        locale,
        overrideAccess: true,
        // The choice is checked against what its saver may read.
        user: owner,
      })
      return (await payload.findGlobal({ slug: 'site', ...site(null, locale) })).counted
    }

    expect(await counted(made['access-secret'])).toBeNull()
    expect(await counted(made['access-work'])).toMatchObject({ slug: 'access-work' })
  })

  it('appear in no search, and leave no hint of themselves in any language', async () => {
    const view = (await getWindowView('/access-work', locale, null)) as View
    const hidden = (
      ['access-vault', 'access-secret', 'access-secret-item', 'access-other-secret'] as const
    ).flatMap((slug) => languages.map((language) => titles[slug][language]))

    expect(view.search).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: titles['access-work'][locale] }),
        expect.objectContaining({
          title: titles['access-grow'][locale],
          group: titles['access-work'][locale],
        }),
      ]),
    )
    for (const title of hidden) expect(JSON.stringify(view)).not.toContain(title)
    for (const slug of ['access-vault', 'access-secret', 'access-other-secret'])
      expect(JSON.stringify(view)).not.toContain(`/${slug}`)
    // Nor their keys, which the hotkeys window lists.
    expect(view.keys.map((one) => one.key)).not.toContain('Q')
    expect(view.keys.map((one) => one.key)).not.toContain('X')
  })

  it('appear in no sitemap, which lists every window a guest may see', async () => {
    const { [locale]: addresses } = await getGuestAddresses()
    expect(addresses).toEqual(expect.arrayContaining(['/access-work', '/access-work/access-grow']))
    const slugs = addresses.flatMap((address) => address.split('/'))
    for (const slug of [
      'access-vault',
      'access-secret',
      'access-secret-item',
      'access-other-secret',
      'access-unpublished',
    ])
      expect(slugs, slug).not.toContain(slug)
  })

  it('appear in no media listing or API answer', async () => {
    const query = `?locale=${locale}&depth=1`
    for (const route of [
      `/windows${query}`,
      `/windows/count${query}`,
      `/windows/${made['access-vault'].id}${query}`,
      `/windows/versions${query}`,
      `/media${query}`,
      `/media/file/${picture.filename}`,
      `/visitors${query}`,
      `/globals/site${query}`,
    ])
      expect((await rest(route)).status, route).toBe(403)

    const graphQL = await GRAPHQL_POST(config)(
      new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ Windows { docs { slug } } }' }),
      }),
    )
    expect(graphQL.status).toBe(404)

    // Payload's own server code that is not the site's, as the admin's for a signed-out request, reads nothing.
    const unnamed = { depth: 0, fallbackLocale: false, locale, overrideAccess: false } as const
    await expect(payload.find({ collection: 'windows', ...unnamed })).rejects.toThrow()
    await expect(payload.find({ collection: 'media', ...unnamed })).rejects.toThrow()
    await expect(
      payload.findVersions({ collection: 'windows', ...site(null, locale) }),
    ).rejects.toThrow()
  })
})

describe.each(languages)('a visitor, in %s', (locale) => {
  it('sees the windows on their list and their items, and nothing else that is hidden', async () => {
    expect(await listed(invited, locale)).toEqual([
      'access-grow',
      'access-secret',
      'access-secret-item',
      'access-work',
    ])
    const item = await payload.findByID({
      collection: 'windows',
      id: made['access-secret-item'].id,
      ...site(invited, locale),
    })
    expect((item.parent as Window).title).toBe(titles['access-secret'][locale])
    expect((item.related as Window[]).map((one) => one.slug)).toEqual(['access-secret'])

    const grow = await payload.findByID({
      collection: 'windows',
      id: made['access-grow'].id,
      ...site(invited, locale),
    })
    expect((grow.related as Window[]).map((one) => one.slug)).toEqual(['access-work'])
  })

  it('finds the windows on their list and their items, and nothing else that is hidden', async () => {
    const view = (await getWindowView('/', locale, invited)) as View
    const found = view.search.map((one) => one.title)

    expect(found).toEqual(
      expect.arrayContaining(
        (['access-work', 'access-grow', 'access-secret', 'access-secret-item'] as const).map(
          (slug) => titles[slug][locale],
        ),
      ),
    )
    for (const slug of ['access-vault', 'access-other-secret'] as const)
      for (const language of languages)
        expect(JSON.stringify(view)).not.toContain(titles[slug][language])
    // The key of a window on their list is theirs, with its title; another's is not.
    expect(view.keys).toContainEqual(
      expect.objectContaining({ key: 'Q', title: titles['access-secret'][locale] }),
    )
    expect(view.keys.map((one) => one.key)).not.toContain('X')
  })

  it('whose invitation ran out sees what a guest sees', async () => {
    expect(await listed(expired, locale)).toEqual(['access-grow', 'access-work'])
    const view = (await getWindowView('/', locale, expired)) as View
    expect(JSON.stringify(view.search)).not.toContain(titles['access-secret'][locale])
  })
})

describe('the content user', () => {
  it('reads with their key no visitor and no other user, in either language', async () => {
    const create = (email: string, role: User['role'], apiKey?: string) =>
      payload.create({
        collection: 'users',
        data: { email, password: 'a-local-password', role, ...(apiKey ? { apiKey } : {}) },
        depth: 0,
        draft: false,
        fallbackLocale: false,
        locale: 'en',
        overrideAccess: true,
      })
    // The admin first, since the first user of an empty database is always the admin.
    const admin = await create(emails[0], 'admin')
    const content = await create(emails[1], 'content', contentKey)
    expect(content.role).toBe('content')
    const headers = { Authorization: `users API-Key ${contentKey}` }

    for (const locale of languages) {
      const query = `?locale=${locale}&depth=0`
      const windows = await rest(`/windows${query}&where[slug][equals]=access-vault`, { headers })
      expect(windows.status).toBe(200)
      expect((await windows.json()).totalDocs).toBe(1)

      expect((await rest(`/visitors${query}`, { headers })).status).toBe(403)
      expect((await rest(`/visitors/${invited.id}${query}`, { headers })).status).toBe(403)
      const users = await rest(`/users${query}`, { headers })
      expect((await users.json()).docs.map((user: User) => user.email)).toEqual([content.email])
      expect((await rest(`/users/${admin.id}${query}`, { headers })).status).not.toBe(200)
    }
  })
})

describe('a visitor', () => {
  it('is no Payload user, so reaches neither the admin nor the API', async () => {
    const login = await rest('/visitors/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: invited.name, password: 'an-invitation-to-see-secrets' }),
    })
    expect(login.status).toBe(404)
    expect(payload.config.admin.user).toBe('users')
    const headers = { Authorization: 'visitors API-Key an-invitation-to-see-secrets' }
    expect((await rest('/windows', { headers })).status).toBe(403)
  })
})
