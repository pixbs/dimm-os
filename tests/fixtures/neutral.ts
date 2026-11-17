import path from 'path'
import type { Payload } from 'payload'
import { fileURLToPath } from 'url'

import type { Media, Window } from '@/payload-types'

// Words in English and, where it is written, in German.
type Words = { en: string; de?: string }

type Sections = NonNullable<Window['sections']>

// A picture, and the same file as a live picture, whose upload is its still.
type Pictures = { still: number; live: number }

type Fixture = Partial<
  Pick<Window, 'kind' | 'hidden' | 'tile' | 'icon' | 'key' | 'oneSize' | 'openAtStart'>
> & {
  slug: string
  parent?: string
  title: Words
  description: Words
  // Made once every window has its id, so a section can link to any of them, and once the pictures are there.
  sections?: (ids: Record<string, number>, pictures: Pictures) => { en: Sections; de?: Sections }
}

// Running text as the editor stores it, from paragraphs, third-level headings and lists of plain words.
type Part = string | { h3: string } | { ul: string[] }
const element = { direction: 'ltr', format: '', indent: 0, version: 1 } as const
const words = (text: string) => [
  { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 } as const,
]
const rich = (...parts: Part[]) => ({
  root: {
    ...element,
    type: 'root' as const,
    children: parts.map((part) =>
      typeof part === 'string'
        ? {
            ...element,
            type: 'paragraph' as const,
            textFormat: 0,
            textStyle: '',
            children: words(part),
          }
        : 'h3' in part
          ? { ...element, type: 'heading' as const, tag: 'h3' as const, children: words(part.h3) }
          : {
              ...element,
              type: 'list' as const,
              listType: 'bullet' as const,
              tag: 'ul' as const,
              start: 1,
              children: part.ul.map((item, at) => ({
                ...element,
                type: 'listitem' as const,
                value: at + 1,
                children: words(item),
              })),
            },
    ),
  },
})

// A picture with the same caption in every place, one or more times.
const pictures = (picture: number, caption: string, count = 1) =>
  Array.from({ length: count }, () => ({ picture, caption }))

// A window told at length: a Header with a lead, an inset picture, facts without a heading, text beside its headings, a
// part that joins the section above, a quotation on paper, a gallery of three, figures beside their heading, running
// text without a heading, a picture edge to edge, and a closing call on an accent to another window.
const told = (
  to: number,
  picture: number,
  t: {
    title: string
    lead: string
    figure: string
    question: string[]
    changed: [string, string, string]
    joined: string
    facts: [string, string][]
    quote: { text: string; name: string; role: string }
    three: string
    figures: [string, [string, string][]]
    caption: string
    closing: string[]
    call: string
  },
): Sections => [
  { blockType: 'header', level: 'title', surface: 'window', title: t.title, text: t.lead },
  { blockType: 'media', ratio: '16:9', items: pictures(picture, t.figure) },
  { blockType: 'facts', items: t.facts.map(([label, value]) => ({ label, value })) },
  { blockType: 'text', title: t.question[0], split: true, body: rich(...t.question.slice(1)) },
  {
    blockType: 'text',
    title: t.changed[0],
    split: true,
    body: rich({ h3: t.changed[1] }, t.changed[2]),
  },
  { blockType: 'text', join: true, body: rich(t.joined) },
  { blockType: 'quote', surface: 'paper', ...t.quote, avatar: picture },
  {
    blockType: 'media',
    title: t.three,
    columns: '3',
    ratio: '4:3',
    items: pictures(picture, t.caption, 3),
  },
  {
    blockType: 'stats',
    title: t.figures[0],
    split: true,
    items: t.figures[1].map(([value, label]) => ({ value, label })),
  },
  { blockType: 'text', body: rich(...t.closing) },
  { blockType: 'media', ratio: '16:9', bleed: true, items: pictures(picture, '') },
  {
    blockType: 'header',
    level: 'heading',
    surface: 'orange',
    title: t.call,
    actions: [{ type: 'window', window: to }],
  },
]

// Neutral windows that show every way the desk reads the content, parents before their items.
const windows: Fixture[] = [
  {
    slug: 'welcome',
    oneSize: true,
    openAtStart: true,
    title: { en: 'Welcome', de: 'Willkommen' },
    description: {
      en: 'A fixture window that opens at the start.',
      de: 'Ein Beispielfenster, das beim Start öffnet.',
    },
  },
  {
    slug: 'work',
    tile: 'orange',
    icon: 'grid',
    key: 'W',
    openAtStart: true,
    title: { en: 'Work', de: 'Arbeit' },
    description: {
      en: 'A fixture window that lists its items.',
      de: 'Ein Beispielfenster, das seine Einträge auflistet.',
    },
  },
  {
    slug: 'grow',
    parent: 'work',
    kind: 'case',
    title: { en: 'Grow', de: 'Grow' },
    description: {
      en: 'A fixture item that every guest may open.',
      de: 'Ein Beispieleintrag, den jeder Gast öffnen darf.',
    },
    sections: (ids, { still }) => ({
      en: told(ids.contact, still, {
        title: 'Grow',
        lead: 'A fixture item that every guest may open. Its lead paragraph says in a sentence or two what the window holds.',
        figure: 'A picture inset in the window, with its caption.',
        question: [
          'The question',
          'A paragraph of running text. It says what there is to say in full sentences and wraps at the measure of prose.',
          'A second paragraph, shorter than the first.',
        ],
        changed: [
          'What changed',
          'A heading inside the text',
          'A paragraph under a heading of its own. It runs over several lines in a narrow window and keeps to the measure in a wide one, wherever the window ends.',
        ],
        joined: 'A part that joins the section above and stands under its heading.',
        facts: [
          ['Kind', 'A fixture item'],
          ['Place', 'The first item of its window'],
          ['Year', '2026'],
        ],
        quote: {
          text: 'A sentence someone else said, quoted in full and set large enough to be read first.',
          name: 'A participant',
          role: 'Interview',
        },
        three: 'Three in a row',
        figures: [
          'Figures',
          [
            ['12', 'things counted'],
            ['48 %', 'of something'],
            ['3×', 'as many as before, in a label long enough to wrap'],
          ],
        ],
        caption: 'A caption.',
        closing: ['Running text without a heading of its own.', 'A second paragraph after it.'],
        call: 'A closing line that asks for one thing',
      }),
      de: told(ids.contact, still, {
        title: 'Grow',
        lead: 'Ein Beispieleintrag, den jeder Gast öffnen darf. Sein Vorspann sagt in ein, zwei Sätzen, was das Fenster enthält.',
        figure: 'Ein Bild mit Abstand zum Fensterrand, mit seiner Bildunterschrift.',
        question: [
          'Die Frage',
          'Ein Absatz Fließtext. Er sagt in ganzen Sätzen, was zu sagen ist, und bricht am Maß des Fließtexts um.',
          'Ein zweiter Absatz, kürzer als der erste.',
        ],
        changed: [
          'Was sich geändert hat',
          'Eine Überschrift im Text',
          'Ein Absatz unter einer eigenen Überschrift. In einem schmalen Fenster läuft er über mehrere Zeilen, in einem breiten hält er das Maß, wo das Fenster auch endet.',
        ],
        joined:
          'Ein Teil, der an den Abschnitt darüber anschließt und unter dessen Überschrift steht.',
        facts: [
          ['Art', 'Ein Beispieleintrag'],
          ['Ort', 'Der erste Eintrag seines Fensters'],
          ['Jahr', '2026'],
        ],
        quote: {
          text: 'Ein Satz, den jemand anderes gesagt hat, vollständig zitiert und groß genug gesetzt, um zuerst gelesen zu werden.',
          name: 'Eine Teilnehmerin',
          role: 'Interview',
        },
        three: 'Drei in einer Reihe',
        figures: [
          'Zahlen',
          [
            ['12', 'gezählte Dinge'],
            ['48 %', 'von etwas'],
            ['3×', 'so viele wie vorher, in einer Beschriftung, die umbricht'],
          ],
        ],
        caption: 'Eine Bildunterschrift.',
        closing: ['Fließtext ohne eigene Überschrift.', 'Ein zweiter Absatz danach.'],
        call: 'Eine Schlusszeile, die um eine Sache bittet',
      }),
    }),
  },
  {
    slug: 'field',
    parent: 'work',
    kind: 'case',
    title: { en: 'Field', de: 'Feld' },
    description: { en: 'A second fixture item.', de: 'Ein zweiter Beispieleintrag.' },
    sections: (_, { still, live }) => ({
      en: [
        {
          blockType: 'media',
          title: 'Two in a row',
          columns: '2',
          ratio: '1:1',
          items: [
            { picture: still, caption: 'A caption.' },
            { picture: live, caption: 'A live picture, still until script runs.' },
          ],
        },
        {
          blockType: 'table',
          title: 'A table',
          columns: [{ label: 'Item' }, { label: 'Kind' }, { label: 'Place' }],
          rows: [
            { first: 'The first row', second: 'A kind', third: 'Here' },
            {
              first: 'A row whose first cell is long enough to wrap in a narrow window',
              second: 'Another kind',
              third: 'There',
            },
            { first: 'The last row', second: 'A kind' },
          ],
        },
        {
          blockType: 'text',
          title: 'Text and facts',
          body: rich('A paragraph that a set of facts continues, under the same heading.'),
        },
        {
          blockType: 'facts',
          join: true,
          items: [
            { label: 'Label', value: 'Value' },
            {
              label: 'A longer label',
              value: 'A value that is long enough to wrap in a narrow window',
            },
          ],
        },
        {
          blockType: 'table',
          join: true,
          columns: [{ label: 'Item' }, { label: 'Kind' }, { label: 'Place' }],
          rows: [{ first: 'A joined row', second: 'A kind', third: 'Here' }],
        },
      ],
    }),
  },
  {
    slug: 'loop',
    parent: 'work',
    kind: 'case',
    title: { en: 'Loop' },
    description: { en: 'A fixture item not yet written in German.' },
    sections: () => ({
      en: [
        {
          blockType: 'header',
          level: 'title',
          surface: 'window',
          title: 'Loop',
          text: 'A fixture item not yet written in German.',
        },
      ],
    }),
  },
  {
    slug: 'vault',
    parent: 'work',
    kind: 'case',
    hidden: true,
    title: { en: 'Vault', de: 'Tresor' },
    description: {
      en: 'A fixture item that only an invited visitor may open.',
      de: 'Ein Beispieleintrag, den nur eingeladene Besucher öffnen dürfen.',
    },
  },
  {
    slug: 'services',
    tile: 'blue',
    icon: 'text',
    key: 'S',
    title: { en: 'Services', de: 'Leistungen' },
    description: {
      en: 'A fixture window for a second app.',
      de: 'Ein Beispielfenster für eine zweite App.',
    },
    sections: () => ({
      en: [
        {
          blockType: 'header',
          level: 'title',
          surface: 'window',
          title: 'Services',
          text: 'A fixture window for a second app. Its lead paragraph opens the window and says what the visitor will find in it.',
        },
      ],
      de: [
        {
          blockType: 'header',
          level: 'title',
          surface: 'window',
          title: 'Leistungen',
          text: 'Ein Beispielfenster für eine zweite App. Sein Vorspann öffnet das Fenster und sagt, was Besucher darin finden.',
        },
      ],
    }),
  },
  {
    slug: 'cv',
    kind: 'pdf',
    tile: 'paper',
    icon: 'file',
    key: 'C',
    title: { en: 'CV', de: 'Lebenslauf' },
    description: {
      en: 'A fixture window for a document.',
      de: 'Ein Beispielfenster für ein Dokument.',
    },
  },
  {
    slug: 'contact',
    tile: 'raised',
    icon: 'mail',
    key: 'K',
    title: { en: 'Contact', de: 'Kontakt' },
    description: {
      en: 'A fixture window for a form.',
      de: 'Ein Beispielfenster für ein Formular.',
    },
  },
  {
    slug: 'archive',
    hidden: true,
    tile: 'mint',
    icon: 'folder',
    title: { en: 'Archive', de: 'Archiv' },
    description: {
      en: 'A hidden fixture window with an item of its own.',
      de: 'Ein verborgenes Beispielfenster mit einem eigenen Eintrag.',
    },
  },
  {
    slug: 'old-notes',
    parent: 'archive',
    kind: 'txt',
    title: { en: 'Old notes', de: 'Alte Notizen' },
    description: {
      en: 'A fixture item that is hidden with its window.',
      de: 'Ein Beispieleintrag, der mit seinem Fenster verborgen ist.',
    },
  },
  {
    slug: 'imprint',
    kind: 'txt',
    title: { en: 'Imprint', de: 'Impressum' },
    description: {
      en: 'A placeholder: the imprint is written in the admin.',
      de: 'Ein Platzhalter: Das Impressum entsteht im Admin.',
    },
  },
  {
    slug: 'privacy-policy',
    kind: 'txt',
    title: { en: 'Privacy', de: 'Datenschutz' },
    description: {
      en: 'A placeholder: the privacy policy is written in the admin.',
      de: 'Ein Platzhalter: Die Datenschutzerklärung entsteht im Admin.',
    },
  },
  {
    slug: '404',
    title: { en: 'Not found', de: 'Nicht gefunden' },
    description: { en: 'Nothing is at this address.', de: 'Unter dieser Adresse ist nichts.' },
  },
]

const trusted = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const

// The neutral picture of the catalogue, uploaded once under each of its names.
export const file = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/ds/catalogue/picture.jpg',
)

async function upload(payload: Payload, data: Pick<Media, 'alt' | 'live'>): Promise<number> {
  const {
    docs: [found],
  } = await payload.find({
    collection: 'media',
    limit: 1,
    where: { alt: { equals: data.alt } },
    locale: 'en',
    ...trusted,
  })
  if (found) return found.id
  const { id } = await payload.create({
    collection: 'media',
    data,
    filePath: file,
    locale: 'en',
    ...trusted,
  })
  return id
}

// Makes the fixture's windows, or brings them back to it, each published in the languages it is written in.
export async function fill(payload: Payload): Promise<Record<string, number>> {
  const ids: Record<string, number> = {}
  for (const { slug, parent, title, description, sections: _, ...shared } of windows) {
    const {
      docs: [found],
    } = await payload.find({
      collection: 'windows',
      locale: 'en',
      pagination: false,
      where: { slug: { equals: slug } },
      ...trusted,
    })
    const data = { ...shared, slug, parent: parent ? ids[parent] : null, _status: 'published' }
    const words = (language: 'en' | 'de') => ({
      title: title[language],
      description: description[language],
    })
    const { id } = found
      ? await payload.update({
          collection: 'windows',
          id: found.id,
          data: { ...data, ...words('en') } as Window,
          locale: 'en',
          ...trusted,
        })
      : await payload.create({
          collection: 'windows',
          data: { ...data, ...words('en') } as Window,
          locale: 'en',
          ...trusted,
        })
    if (title.de)
      await payload.update({
        collection: 'windows',
        id,
        data: { ...data, ...words('de') } as Window,
        locale: 'de',
        ...trusted,
      })
    ids[slug] = id
  }
  const shown = {
    still: await upload(payload, { alt: 'A sun setting over two hills' }),
    live: await upload(payload, { alt: 'A sun drawn in dots', live: 'portrait' }),
  }
  for (const { slug, sections } of windows) {
    const { en, de } = sections?.(ids, shown) ?? {}
    for (const [locale, made] of [
      ['en', en],
      ['de', de],
    ] as const) {
      if (made)
        await payload.update({
          collection: 'windows',
          id: ids[slug],
          data: { sections: made },
          locale,
          ...trusted,
        })
    }
  }

  await payload.updateGlobal({
    slug: 'site',
    data: {
      name: 'Dimm OS',
      email: 'site@example.com',
      place: 'Somewhere',
      timezone: 'Europe/London',
    },
    locale: 'en',
    ...trusted,
  })
  return ids
}
