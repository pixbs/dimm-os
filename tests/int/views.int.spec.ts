import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getWindowView, type View } from '@/data/views'
import type { Visitor, Window } from '@/payload-types'

import { fill } from '../fixtures/neutral'

let payload: Payload
let ids: Record<string, number>
let invited: Visitor
let expired: Visitor

const languages = ['en', 'de'] as const
const names = ['Views, invited', 'Views, expired']
const made = ['views-draft-parent', 'views-orphan']
const trusted = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const

// The view of a path that has a window.
async function view(path: string, language: 'en' | 'de', viewer: Visitor | null = null) {
  const found = await getWindowView(path, language, viewer)
  expect(found, path).not.toBeNull()
  expect(found).not.toHaveProperty('moved')
  return found as View
}

const titles = (view: View) =>
  view.window?.sections.flatMap((section) =>
    section.type === 'list' ? section.items.map((item) => item.title) : [],
  )

beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.delete({
    collection: 'visitors',
    overrideAccess: true,
    where: { name: { in: names } },
  })
  await payload.delete({
    collection: 'windows',
    locale: 'en',
    where: { slug: { in: made } },
    ...trusted,
  })
  ids = await fill(payload)

  const visitor = (name: string, password: string, expires: string) =>
    payload.create({
      collection: 'visitors',
      data: { name, password, windows: [ids.vault, ids.archive], expires } as Visitor,
      depth: 0,
      overrideAccess: true,
    })
  invited = await visitor('Views, invited', 'an-invitation-to-the-views', '2999-01-01')
  expired = await visitor('Views, expired', 'an-invitation-to-the-past', '2000-01-01')
})

afterAll(async () => {
  await payload.delete({
    collection: 'visitors',
    overrideAccess: true,
    where: { name: { in: names } },
  })
  await payload.delete({
    collection: 'windows',
    locale: 'en',
    where: { slug: { in: made } },
    ...trusted,
  })
  await fill(payload)
})

describe('the view of a window', () => {
  it('is plain JSON, with its words as HTML', async () => {
    const grow = await view('/work/grow', 'en')

    expect(JSON.parse(JSON.stringify(grow))).toEqual(grow)
    expect(grow.window?.sections).toEqual([
      { type: 'text', html: '<p>A fixture item that every guest may open.</p>' },
    ])
  })

  it('gives each window one path in each language, and its shortcut in its order', async () => {
    const en = await view('/work', 'en')
    const de = await view('/work', 'de')

    expect(en.shortcuts.map(({ href, name }) => [href, name])).toEqual([
      ['/work', 'Work'],
      ['/services', 'Services'],
      ['/cv', 'CV.pdf'],
      ['/contact', 'Contact'],
    ])
    expect(de.shortcuts[0]).toEqual({
      href: '/de/work',
      name: 'Arbeit',
      icon: 'grid',
      tile: 'orange',
    })
    expect(en.keys).toEqual(
      ['W', 'S', 'C', 'K'].map((key, at) => ({ key, path: en.shortcuts[at].href })),
    )
    expect(de.window?.sections[1]).toMatchObject({
      items: [{ href: '/de/work/grow' }, { href: '/de/work/field' }, { href: '/de/work/loop' }],
    })
    expect(en.window).toMatchObject({ count: 3, parent: null, counters: null })
  })

  it("shows an item in its parent's window, with the way back, its place and its neighbours", async () => {
    const field = await view('/work/field', 'en')

    expect(field.window).toMatchObject({
      path: '/work/field',
      frame: { title: 'Field', kind: 'case', tile: 'orange' },
      parent: { href: '/work', title: 'Work' },
      counters: { position: 2, total: 3 },
      neighbours: {
        previous: { href: '/work/grow', title: 'Grow' },
        next: { href: '/work/loop', title: 'Loop' },
      },
    })
  })

  it('has the windows that open at start at /, and no window of its own', async () => {
    const desk = await view('/', 'en')

    expect(desk.window).toBeNull()
    expect(desk.start.map((window) => window.path)).toEqual(['/welcome', '/work'])
  })

  it.each(languages)('resolves the paths of the system, in %s', async (language) => {
    const preferences = await view('/preferences', language)
    const cookies = await view('/cookies/preferences', language)

    expect(preferences.window?.frame).toMatchObject({
      title: { en: 'Preferences', de: 'Einstellungen' }[language],
      kind: 'sys',
    })
    expect((await view('/about', language)).window?.frame.title).toContain('Dimm OS')
    expect(cookies.window?.parent?.href).toBe(language === 'en' ? '/cookies' : '/de/cookies')
  })

  it('has nothing at a path that does not exist, nor at the 404 window', async () => {
    for (const path of ['/nothing', '/work/nothing', '/404'])
      expect(await getWindowView(path, 'en', null), path).toBeNull()
  })

  it('sends a known window under an old parent to its path', async () => {
    expect(await getWindowView('/services/grow', 'en', null)).toEqual({ moved: '/work/grow' })
    expect(await getWindowView('/field', 'de', null)).toEqual({ moved: '/work/field' })
  })
})

describe.each(languages)('as a guest, in %s, a hidden window and its items', (language) => {
  it('appear in no list, count, pager, shortcut or key', async () => {
    const work = await view('/work', language)
    const loop = await view('/work/loop', language)

    expect(titles(work)).not.toContain('Vault')
    expect(work.window?.count).toBe(3)
    expect(loop.window).toMatchObject({ counters: { total: 3 }, neighbours: { next: null } })
    expect(work.shortcuts.map((shortcut) => shortcut.href)).not.toContain('/archive')
    expect(work.keys).toHaveLength(4)
  })

  it('have no view, and move nowhere', async () => {
    for (const path of ['/work/vault', '/archive', '/archive/old-notes', '/elsewhere/vault'])
      expect(await getWindowView(path, language, null), path).toBeNull()
  })
})

describe.each(languages)('a visitor, in %s', (language) => {
  it('sees the windows on their list and their items', async () => {
    const work = await view('/work', language, invited)
    const vault = await view('/work/vault', language, invited)
    const notes = await view('/archive/old-notes', language, invited)

    expect(titles(work)).toHaveLength(4)
    expect(vault.window).toMatchObject({ counters: { position: 4, total: 4 } })
    expect(notes.window?.parent?.title).toBe({ en: 'Archive', de: 'Archiv' }[language])
    expect(work.shortcuts.map((shortcut) => shortcut.name)).toContain(
      { en: 'Archive', de: 'Archiv' }[language],
    )
    expect(await getWindowView('/elsewhere/vault', language, invited)).toEqual({
      moved: '/work/vault',
    })
  })

  it('whose invitation ran out sees what a guest sees', async () => {
    expect(await getWindowView('/work/vault', language, expired)).toBeNull()
    expect(titles(await view('/work', language, expired))).toHaveLength(3)
  })
})

describe('German that is not written yet', () => {
  it('shows the English, and says so on every part that is English', async () => {
    const work = await view('/work', 'de')
    const loop = await view('/work/loop', 'de')
    const field = await view('/work/field', 'de')

    expect(work.window?.sections[1]).toMatchObject({
      items: [{ title: 'Grow' }, { title: 'Feld' }, { title: 'Loop', lang: 'en' }],
    })
    expect(work.window?.lang).toBeUndefined()
    expect(loop.window).toMatchObject({
      lang: 'en',
      frame: { title: 'Loop' },
      parent: { title: 'Arbeit' },
      sections: [{ html: '<p>A fixture item not yet written in German.</p>' }],
    })
    expect(field.window?.neighbours.next).toEqual({
      href: '/de/work/loop',
      title: 'Loop',
      lang: 'en',
    })
  })

  it('is never shown in a legal window, which has no German view without German', async () => {
    await payload.delete({
      collection: 'windows',
      locale: 'en',
      where: { slug: { equals: 'privacy-policy' } },
      ...trusted,
    })
    await payload.create({
      collection: 'windows',
      data: { title: 'Privacy', slug: 'privacy-policy', _status: 'published' } as Window,
      locale: 'en',
      ...trusted,
    })

    expect((await view('/privacy-policy', 'en')).window?.frame.title).toBe('Privacy')
    expect(await getWindowView('/privacy-policy', 'de', null)).toBeNull()
  })
})

describe('a published item of a parent that is not', () => {
  it('shows by its own status, alone, with its parent absent', async () => {
    const { id } = await payload.create({
      collection: 'windows',
      data: { title: 'Draft parent', slug: 'views-draft-parent', _status: 'draft' } as Window,
      locale: 'en',
      ...trusted,
      draft: true,
    })
    await payload.create({
      collection: 'windows',
      data: { title: 'Orphan', slug: 'views-orphan', parent: id, _status: 'published' } as Window,
      locale: 'en',
      ...trusted,
    })

    const orphan = await view('/views-orphan', 'en')
    expect(orphan.window).toMatchObject({ parent: null, counters: null })
    expect(await getWindowView('/views-draft-parent', 'en', null)).toBeNull()
    expect(await getWindowView('/views-draft-parent/views-orphan', 'en', null)).toEqual({
      moved: '/views-orphan',
    })
  })
})
