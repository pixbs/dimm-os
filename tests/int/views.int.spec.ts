import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getWindowView, type View } from '@/data/views'
import type { Media, Visitor, Window } from '@/payload-types'

import { file, fill } from '../fixtures/neutral'

let payload: Payload
let ids: Record<string, number>
let invited: Visitor
let expired: Visitor

const languages = ['en', 'de'] as const
const names = ['Views, invited', 'Views, expired']
const made = ['views-draft-parent', 'views-orphan', 'views-sections']
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
    section.type === 'items' ? section.items.map((item) => item.title) : [],
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

// Running text as the editor stores it: a paragraph with a link of each kind between its words.
const linked = (...links: object[]) => ({
  root: {
    type: 'root',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: '',
        children: links.map((fields, at) => ({
          type: 'link',
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
          fields: { newTab: false, ...fields },
          children: [
            {
              type: 'text',
              text: `link ${at}`,
              format: 0,
              detail: 0,
              mode: 'normal',
              style: '',
              version: 1,
            },
          ],
        })),
      },
    ],
  },
})

describe('the view of a window', () => {
  it('is plain JSON: its sections as data, and running text as HTML made on the server', async () => {
    const grow = await view('/work/grow', 'en')

    expect(JSON.parse(JSON.stringify(grow))).toEqual(grow)
    // Nothing of Payload travels with it: no block, no node of the editor, no id.
    expect(JSON.stringify(grow)).not.toMatch(/"(id|blockType|blockName|root|children|fields)":/)
    expect(grow.window?.sections.slice(0, 5)).toEqual([
      {
        type: 'header',
        level: 'title',
        surface: 'window',
        title: 'Grow',
        text: 'A fixture item that every guest may open. Its lead paragraph says in a sentence or two what the window holds.',
        actions: [],
      },
      {
        type: 'media',
        title: null,
        text: null,
        columns: 1,
        ratio: '16:9',
        bleed: false,
        items: [
          {
            src: expect.stringMatching(/^\/api\/media\/file\/picture(-\d+)?\.jpg$/),
            alt: 'A sun setting over two hills',
            caption: 'A picture inset in the window, with its caption.',
            position: '50% 50%',
            live: null,
          },
        ],
      },
      {
        type: 'facts',
        title: null,
        text: null,
        split: false,
        join: false,
        surface: 'window',
        items: [
          { label: 'Kind', value: 'A fixture item' },
          { label: 'Place', value: 'The first item of its window' },
          { label: 'Year', value: '2026' },
        ],
      },
      {
        type: 'text',
        title: 'The question',
        text: null,
        split: true,
        join: false,
        html: '<p>A paragraph of running text. It says what there is to say in full sentences and wraps at the measure of prose.</p><p>A second paragraph, shorter than the first.</p>',
      },
      expect.objectContaining({
        html: expect.stringMatching(/^<h3>A heading inside the text<\/h3><p>/),
      }),
    ])
  })

  it.each(languages)(
    'lets a section join the one above it under its heading, in %s',
    async (language) => {
      const sections = (await view('/work/grow', language)).window!.sections

      expect(sections.map((section) => 'join' in section && section.join)).toEqual([
        false,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ])
      // A joined section has no heading of its own.
      expect(sections[5]).toMatchObject({ title: null, text: null })
    },
  )

  it('gives a Header nothing to join, since it has no body to share', async () => {
    const { id } = await payload.create({
      collection: 'windows',
      data: {
        title: 'Sections',
        slug: 'views-sections',
        _status: 'published',
        sections: [
          { blockType: 'header', title: 'Sections' },
          { blockType: 'text', join: true, body: linked({ linkType: 'custom', url: '/work' }) },
        ],
      } as Window,
      locale: 'en',
      ...trusted,
    })

    expect((await view('/views-sections', 'en')).window?.sections[1]).toMatchObject({ join: false })
    await payload.delete({ collection: 'windows', id, overrideAccess: true })
  })

  it('gives a picture its file, its words, its crop and whether it is live, one picture one column', async () => {
    const [kept, gone] = await Promise.all(
      [
        { alt: 'Views, kept', live: 'portrait', focalX: 20, focalY: 80 },
        { alt: 'Views, gone' },
      ].map((data) =>
        payload.create({
          collection: 'media',
          data: data as Media,
          filePath: file,
          locale: 'en',
          ...trusted,
        }),
      ),
    )
    const { id } = await payload.create({
      collection: 'windows',
      data: {
        title: 'Sections',
        slug: 'views-sections',
        _status: 'published',
        sections: [
          {
            blockType: 'media',
            title: 'Pictures',
            text: 'Words under the heading.',
            columns: '3',
            ratio: '1:1',
            bleed: true,
            items: [{ picture: kept.id, caption: 'Its caption here.' }],
          },
          { blockType: 'text', body: linked({ linkType: 'custom', url: '/work' }) },
          { blockType: 'media', items: [{ picture: gone.id }] },
          { blockType: 'text', join: true, body: linked({ linkType: 'custom', url: '/work' }) },
        ],
      } as Window,
      locale: 'en',
      ...trusted,
    })
    // A section whose pictures are all gone is gone too, and the text after it still stands alone.
    await payload.delete({ collection: 'media', id: gone.id, overrideAccess: true })

    expect((await view('/views-sections', 'en')).window?.sections).toEqual([
      {
        type: 'media',
        title: 'Pictures',
        text: 'Words under the heading.',
        columns: 1,
        ratio: '1:1',
        bleed: true,
        items: [
          {
            src: expect.stringMatching(/^\/api\/media\/file\/picture-\d+\.jpg$/),
            alt: 'Views, kept',
            caption: 'Its caption here.',
            position: '20% 80%',
            live: 'portrait',
          },
        ],
      },
      expect.objectContaining({ type: 'text', join: false }),
      expect.objectContaining({ type: 'text', join: false }),
    ])
    await payload.delete({ collection: 'windows', id, overrideAccess: true })
    await payload.delete({ collection: 'media', id: kept.id, overrideAccess: true })
  })

  it('gives figures, a quotation, facts and a table their words, the table a cell for each column', async () => {
    const { id } = await payload.create({
      collection: 'windows',
      data: {
        title: 'Sections',
        slug: 'views-sections',
        _status: 'published',
        sections: [
          {
            blockType: 'stats',
            title: 'Figures',
            surface: 'mint',
            items: [{ value: '12', label: 'things counted' }],
          },
          { blockType: 'quote', text: 'Words someone said.', name: 'A participant' },
          {
            blockType: 'table',
            title: 'A table',
            surface: 'paper',
            columns: [{ label: 'One' }, { label: 'Two' }],
            rows: [
              { first: 'A', second: 'B', third: 'left over from three columns' },
              { first: 'C' },
            ],
          },
          {
            blockType: 'facts',
            join: true,
            title: 'Not shown',
            items: [{ label: 'Label', value: 'Value' }],
          },
        ],
      } as Window,
      locale: 'en',
      ...trusted,
    })

    expect((await view('/views-sections', 'en')).window?.sections).toEqual([
      {
        type: 'stats',
        title: 'Figures',
        text: null,
        split: true,
        join: false,
        surface: 'mint',
        items: [{ value: '12', label: 'things counted' }],
      },
      {
        type: 'quote',
        surface: 'window',
        text: 'Words someone said.',
        name: 'A participant',
        role: null,
        avatar: null,
      },
      {
        type: 'table',
        title: 'A table',
        text: null,
        join: false,
        surface: 'paper',
        columns: ['One', 'Two'],
        rows: [
          ['A', 'B'],
          ['C', ''],
        ],
      },
      {
        type: 'facts',
        title: null,
        text: null,
        split: false,
        join: true,
        surface: 'window',
        items: [{ label: 'Label', value: 'Value' }],
      },
    ])
    await payload.delete({ collection: 'windows', id, overrideAccess: true })

    // An avatar is its file and its crop: the name beside it says who it is.
    const grow = (await view('/work/grow', 'en')).window!.sections
    expect(grow.find((section) => section.type === 'quote')).toMatchObject({
      surface: 'paper',
      avatar: { src: expect.stringMatching(/^\/api\/media\/file\//), position: '50% 50%' },
    })
  })

  it('lets figures, facts and a table join text, figures, facts or a table, but not a quotation', async () => {
    const { id } = await payload.create({
      collection: 'windows',
      data: {
        title: 'Sections',
        slug: 'views-sections',
        _status: 'published',
        sections: [
          { blockType: 'facts', items: [{ label: 'Label', value: 'Value' }] },
          { blockType: 'stats', join: true, items: [{ value: '1', label: 'one' }] },
          {
            blockType: 'table',
            join: true,
            columns: [{ label: 'One' }, { label: 'Two' }],
            rows: [{ first: 'A' }],
          },
          { blockType: 'quote', text: 'Words someone said.', name: 'A participant' },
          { blockType: 'facts', join: true, items: [{ label: 'Label', value: 'Value' }] },
        ],
      } as Window,
      locale: 'en',
      ...trusted,
    })

    const sections = (await view('/views-sections', 'en')).window!.sections
    expect(sections.map((section) => 'join' in section && section.join)).toEqual([
      false,
      true,
      true,
      false,
      false,
    ])
    await payload.delete({ collection: 'windows', id, overrideAccess: true })
  })

  it('gives a list its items in one shape, and leaves out a row about a window the viewer may not see', async () => {
    const { id } = await payload.create({
      collection: 'windows',
      data: {
        title: 'Sections',
        slug: 'views-sections',
        _status: 'published',
        sections: [
          {
            blockType: 'list',
            title: 'A list',
            text: 'Not shown in a headed list.',
            endLabel: 'End',
            lead: 'index',
            rows: 'link',
            large: true,
            items: [
              {
                name: 'Name',
                caption: 'Caption',
                title: 'Title',
                text: 'A line\n\nAnother line',
                end: 'End text',
                share: 9,
                of: 12,
                window: ids.work,
              },
              { title: 'Hidden', window: ids.vault },
              { title: 'Away', url: 'https://example.com' },
              { caption: 'Shown with a name only', title: 'Unnamed', url: '/work' },
            ],
            foot: [{ type: 'window', window: ids.vault }],
          },
          {
            blockType: 'list',
            join: true,
            lead: 'none',
            rows: 'plain',
            items: [{ title: 'Joined' }],
          },
        ],
      } as Window,
      locale: 'en',
      ...trusted,
    })
    // A row that leads to the window it is in, which has an id only once it is made.
    await payload.update({
      collection: 'windows',
      id,
      data: {
        title: 'Abschnitte',
        _status: 'published',
        sections: [
          {
            blockType: 'list',
            lead: 'none',
            rows: 'link',
            items: [{ title: 'Here', window: id }],
            foot: [{ type: 'window', window: ids.work, label: 'All of it' }],
          },
          { blockType: 'list', join: true, lead: 'none', rows: 'plain', items: [] },
        ],
      } as Window,
      locale: 'de',
      ...trusted,
    })

    const [list, joined] = (await view('/views-sections', 'en')).window!.sections
    expect(list).toEqual({
      type: 'list',
      title: null,
      text: null,
      split: false,
      join: false,
      surface: 'window',
      large: true,
      lead: 'index',
      opens: false,
      head: { title: 'A list', end: 'End' },
      items: [
        {
          name: 'Name',
          caption: 'Caption',
          title: 'Title',
          text: ['A line', 'Another line'],
          end: 'End text',
          meter: { on: 9, of: 12, label: '9 of 12' },
          icon: null,
          picture: null,
          href: '/work',
          current: false,
        },
        expect.objectContaining({ title: 'Away', href: 'https://example.com' }),
        expect.objectContaining({ name: null, caption: null, title: 'Unnamed', href: '/work' }),
      ],
      foot: null,
      empty: null,
    })
    expect(joined).toMatchObject({ type: 'list', join: true, items: [{ title: 'Joined' }] })

    const [here, none] = (await view('/views-sections', 'de')).window!.sections
    expect(here).toMatchObject({
      head: null,
      items: [{ title: 'Here', href: '/de/views-sections', current: true }],
      foot: { href: '/de/work', label: 'All of it' },
    })
    expect(none).toMatchObject({ items: [], empty: 'Hier ist noch nichts.' })
    await payload.delete({ collection: 'windows', id, overrideAccess: true })

    // A meter reads as a share in the page's language.
    const steps = (language: 'en' | 'de') =>
      view('/work/grow', language).then(({ window }) =>
        window!.sections.find((section) => section.type === 'list'),
      )
    expect(await steps('en')).toMatchObject({ items: [{ meter: { label: '9 of 12' } }, {}, {}] })
    expect(await steps('de')).toMatchObject({ items: [{ meter: { label: '9 von 12' } }, {}, {}] })
  })

  it.each(languages)(
    'resolves the buttons of a Header, a window under its title when it has no label, in %s',
    async (language) => {
      const grow = await view('/work/grow', language)

      expect(grow.window?.sections.at(-1)).toMatchObject({
        type: 'header',
        level: 'heading',
        surface: 'orange',
        actions: [
          {
            href: { en: '/contact', de: '/de/contact' }[language],
            label: { en: 'Contact', de: 'Kontakt' }[language],
          },
        ],
      })
    },
  )

  it('leaves out a button and a link to a window the viewer may not see, and marks a link that leaves', async () => {
    await payload.create({
      collection: 'windows',
      data: {
        title: 'Sections',
        slug: 'views-sections',
        _status: 'published',
        sections: [
          {
            blockType: 'header',
            title: 'Sections',
            actions: [
              { type: 'window', window: ids.vault },
              { type: 'window', window: ids.work, label: 'Back' },
              { type: 'address', url: 'https://example.com', label: 'Away' },
            ],
          },
          {
            blockType: 'text',
            body: linked(
              { linkType: 'internal', doc: { relationTo: 'windows', value: ids.vault } },
              { linkType: 'internal', doc: { relationTo: 'windows', value: ids.work } },
              { linkType: 'custom', url: 'https://example.com' },
            ),
          },
        ],
      } as Window,
      locale: 'en',
      ...trusted,
    })

    const [header, text] = (await view('/views-sections', 'en')).window!.sections
    expect(header).toMatchObject({
      actions: [
        { href: '/work', label: 'Back' },
        { href: 'https://example.com', label: 'Away' },
      ],
    })
    expect(text).toMatchObject({
      html: expect.stringMatching(
        /^<p>link 0<a class="link" href="\/work">link 1<\/a><a class="link" href="https:\/\/example.com">link 2<svg .*<\/svg><\/a><\/p>$/,
      ),
    })

    const [shown] = (await view('/views-sections', 'en', invited)).window!.sections
    expect(shown).toMatchObject({ actions: [{ href: '/work/vault', label: 'Vault' }, {}, {}] })
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
    expect(de.window?.sections.at(-1)).toMatchObject({
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

    expect(work.window?.sections.at(-1)).toMatchObject({
      items: [{ title: 'Grow' }, { title: 'Feld' }, { title: 'Loop', lang: 'en' }],
    })
    expect(work.window?.lang).toBeUndefined()
    expect(loop.window).toMatchObject({
      lang: 'en',
      frame: { title: 'Loop' },
      parent: { title: 'Arbeit' },
      sections: [{ type: 'header', title: 'Loop' }],
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
