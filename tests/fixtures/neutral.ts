import path from 'path'
import type { Payload } from 'payload'
import { fileURLToPath } from 'url'

import type { Media, Window } from '@/payload-types'

// Words in English and, where it is written, in German.
type Words = { en: string; de?: string }

type Sections = NonNullable<Window['sections']>

// A picture, and the same file as live pictures, whose upload is their still.
type Pictures = { still: number; live: number; lost: number }

// A foot button to a window by its slug, to the fixture's file, or to an address.
type Button = { window?: string; file?: true; url?: string; label?: Words }

type Fixture = Partial<
  Pick<
    Window,
    | 'kind'
    | 'hidden'
    | 'tile'
    | 'icon'
    | 'key'
    | 'oneSize'
    | 'openAtStart'
    | 'paper'
    | 'stamp'
    | 'width'
    | 'height'
  >
> & {
  slug: string
  parent?: string
  title: Words
  description: Words
  actions?: Button[]
  // What stands beside its content: its chapters, or a record card of facts and buttons to addresses.
  aside?:
    | { type: 'contents' }
    | {
        type: 'record'
        title: Words
        facts: { en: [string, string][]; de: [string, string][] }
        actions: { url: string; label: Words }[]
      }
  // How it shows as an item of its window, and the windows it relates to, by their slugs.
  listing?: {
    caption: Words
    headline: Words
    note: Words
    facts: { en: [string, string][]; de?: [string, string][] }
    related: string[]
  }
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
// part that joins the section above, a quotation on paper, a gallery of three, figures beside their heading, steps
// with a meter each, running text without a heading, a picture edge to edge, and a closing call on an accent to another
// window.
const told = (
  to: number,
  picture: number,
  t: {
    title: string
    lead: string
    figure: string
    question: string[]
    seen: [string, [string, number, string][]]
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
  {
    blockType: 'list',
    title: t.seen[0],
    split: true,
    lead: 'index',
    rows: 'plain',
    items: t.seen[1].map(([title, share, text]) => ({ title, share, of: 12, text })),
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

// A window that opens with an index at the heading scale, which leads to windows and away and has no heading of its own.
const indexed = (
  ids: Record<string, number>,
  t: { title: string; lead: string; index: [string, string][]; when: string },
): Sections => [
  { blockType: 'header', level: 'title', surface: 'window', title: t.title, text: t.lead },
  {
    blockType: 'list',
    large: true,
    lead: 'index',
    rows: 'link',
    items: t.index.map(([name, title], at) => ({
      name,
      title,
      text: t.when,
      ...(at < 2 ? { window: [ids.work, ids.cv][at] } : { url: 'https://example.com' }),
    })),
  },
]

// Lists under their headings: steps, rows that open in place, a row to an item with a foot that leads on, and a list
// that is still empty.
const lists = (ids: Record<string, number>): Sections => [
  {
    blockType: 'list',
    title: 'Steps',
    split: true,
    lead: 'index',
    rows: 'plain',
    items: ['A first step.', 'A second step.', 'A third step.', 'A last step.'].map((title) => ({
      title,
      text: 'What happens in it, in one sentence.',
    })),
  },
  {
    blockType: 'list',
    title: 'Questions',
    split: true,
    lead: 'none',
    rows: 'opens',
    items: [
      { title: 'A question that opens?', text: 'Its answer, which shows once the row is open.' },
      { title: 'Another question?', text: 'Another answer.\nIts second line.' },
    ],
  },
  {
    blockType: 'list',
    title: 'Where it is used',
    split: true,
    lead: 'none',
    rows: 'link',
    items: [
      {
        name: 'Grow',
        caption: 'A fixture item',
        title: 'An item the row leads to',
        window: ids.grow,
      },
    ],
    foot: [{ type: 'window', window: ids.work }],
  },
  {
    blockType: 'list',
    title: 'Three columns',
    split: true,
    lead: 'none',
    rows: 'plain',
    items: [{ name: 'A name', caption: 'A caption', title: 'What it says', end: 'An end' }],
  },
  { blockType: 'list', title: 'Still to come', lead: 'none', rows: 'plain' },
  {
    blockType: 'list',
    title: 'Items of a window',
    source: 'window',
    from: ids.work,
    large: true,
    lead: 'index',
    rows: 'link',
    limit: 2,
  },
]

// A document whose rows stand in headed groups, a role and its place beside what was done, a kind at the end.
const record = (t: {
  title: string
  lead: string
  end: string
  groups: [string, string[][]][]
  facts: [string, [string, string][]]
}) =>
  [
    { blockType: 'header', level: 'title', surface: 'window', title: t.title, text: t.lead },
    ...t.groups.map(([title, rows]) => ({
      blockType: 'list' as const,
      title,
      endLabel: t.end,
      lead: 'none' as const,
      rows: 'plain' as const,
      items: rows.map(([name, caption, title, end]) => ({ name, caption, title, end })),
    })),
    {
      blockType: 'facts' as const,
      title: t.facts[0],
      items: t.facts[1].map(([label, value]) => ({ label, value })),
    },
  ] satisfies Sections

// A window of chapters: a Header, facts in short, then each chapter a text under its heading with facts joined to it.
const chaptered = (t: { title: string; lead: string; short: string; chapters: string[] }) =>
  [
    { blockType: 'header', level: 'display', surface: 'window', title: t.title, text: t.lead },
    {
      blockType: 'facts',
      title: t.short,
      split: false,
      items: [{ label: t.short, value: t.lead }],
    },
    ...t.chapters.flatMap((title) => [
      {
        blockType: 'text' as const,
        title,
        split: false,
        body: rich(`${title}: ${t.lead}`, t.lead, t.lead),
      },
      {
        blockType: 'facts' as const,
        join: true,
        items: [{ label: title, value: t.lead }],
      },
    ]),
  ] satisfies Sections

// Neutral windows that show every way the desk reads the content, parents before their items.
const windows: Fixture[] = [
  {
    slug: 'welcome',
    openAtStart: true,
    width: 780,
    height: 480,
    actions: [{ window: 'work' }, { window: 'cv' }],
    title: { en: 'Welcome', de: 'Willkommen' },
    description: {
      en: 'A fixture window that opens at the start.',
      de: 'Ein Beispielfenster, das beim Start öffnet.',
    },
  },
  {
    slug: 'hello',
    title: { en: 'Hello', de: 'Hallo' },
    description: {
      en: 'A fixture window of tiles that fill it.',
      de: 'Ein Beispielfenster aus Kacheln, die es füllen.',
    },
    sections: (ids, { still }) => {
      const tiles = (name: string, statement: string, download: string) => [
        {
          blockType: 'cards' as const,
          tiles: true,
          columns: '2' as const,
          items: [
            { title: name, text: 'A line under it', surface: 'paper' as const, picture: still },
            {
              title: statement,
              surface: 'orange' as const,
              actions: [
                { type: 'window' as const, window: ids.work },
                { type: 'media' as const, media: still, label: download },
              ],
            },
          ],
        },
      ]
      return {
        en: tiles('A name', 'A window that says one thing.', 'Download'),
        de: tiles('Ein Name', 'Ein Fenster, das eine Sache sagt.', 'Herunterladen'),
      }
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
    // The index of its own items at the heading scale, each opening to its preview, filtered by what they relate to.
    sections: (ids) => {
      const index: Sections = [
        {
          blockType: 'list',
          source: 'window',
          from: ids.work,
          filter: true,
          large: true,
          lead: 'index',
          rows: 'opens',
        },
      ]
      return { en: index, de: index }
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
    listing: {
      caption: { en: 'First item, 2026', de: 'Erster Eintrag, 2026' },
      headline: {
        en: 'Which question does the first item answer?',
        de: 'Welche Frage beantwortet der erste Eintrag?',
      },
      note: {
        en: 'How it was found out, in one line',
        de: 'Wie es herausgefunden wurde, in einer Zeile',
      },
      facts: {
        en: [
          ['Role', 'A role'],
          ['Outcome', 'An outcome'],
        ],
        de: [
          ['Rolle', 'Eine Rolle'],
          ['Ergebnis', 'Ein Ergebnis'],
        ],
      },
      related: ['services', 'cv'],
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
        seen: [
          'What was counted',
          [
            ['A thing counted often.', 9, 'Counted 9 times of 12.'],
            [
              'A thing counted less often, in a line long enough to wrap.',
              7,
              'Counted 7 times of 12.',
            ],
            ['A thing counted almost every time.', 11, 'Counted 11 times of 12.'],
          ],
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
        seen: [
          'Was gezählt wurde',
          [
            ['Etwas, das oft gezählt wurde.', 9, '9 von 12 Mal gezählt.'],
            [
              'Etwas, das seltener gezählt wurde, in einer Zeile, die umbricht.',
              7,
              '7 von 12 Mal gezählt.',
            ],
            ['Etwas, das fast jedes Mal gezählt wurde.', 11, '11 von 12 Mal gezählt.'],
          ],
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
    listing: {
      caption: { en: 'Second item, 2026', de: 'Zweiter Eintrag, 2026' },
      headline: {
        en: 'Which question does the second item answer, in a line long enough to wrap?',
        de: 'Welche Frage beantwortet der zweite Eintrag, in einer Zeile, die umbricht?',
      },
      note: { en: 'How it was found out', de: 'Wie es herausgefunden wurde' },
      facts: { en: [['Role', 'Another role']], de: [['Rolle', 'Eine andere Rolle']] },
      related: ['services'],
    },
    sections: (ids, { still, live }) => ({
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
        {
          blockType: 'list',
          title: 'Beside it',
          lead: 'picture',
          rows: 'link',
          items: ['Grow', 'Field', 'Loop', 'Vault'].map((title) => ({
            title,
            text: 'An item of the same window.',
            picture: still,
            window: ids[title.toLowerCase()],
          })),
        },
        ...lists(ids),
        {
          blockType: 'cards',
          title: 'Three cards',
          columns: '3',
          items: ['One', 'Two', 'Three'].map((title) => ({
            title,
            surface: 'raised' as const,
            text: 'Text that says in a sentence or two what this is about.',
            picture: still,
          })),
        },
        {
          blockType: 'cards',
          columns: '2',
          items: [
            {
              title: 'On paper',
              surface: 'paper',
              text: 'A card whose button opens a window under its title.',
              actions: [{ type: 'window', window: ids.grow }],
            },
            {
              title: 'On orange',
              surface: 'orange',
              text: 'A card whose button leads to a window only an invited visitor may see.',
              actions: [{ type: 'window', window: ids.vault }],
            },
          ],
        },
        {
          blockType: 'cards',
          title: 'Cards of a window',
          columns: '3',
          source: 'window',
          from: ids.work,
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
    listing: {
      caption: { en: 'Third item, 2026' },
      headline: { en: 'Which question does an item not yet written in German answer?' },
      note: { en: 'How it was found out' },
      facts: { en: [['Role', 'A role']] },
      related: ['cv'],
    },
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
    listing: {
      caption: { en: 'Fourth item, 2026', de: 'Vierter Eintrag, 2026' },
      headline: {
        en: 'Which question does an item for invited visitors answer?',
        de: 'Welche Frage beantwortet ein Eintrag für eingeladene Besucher?',
      },
      note: { en: 'How it was found out', de: 'Wie es herausgefunden wurde' },
      facts: { en: [['Role', 'A role']], de: [['Rolle', 'Eine Rolle']] },
      related: ['archive', 'services'],
    },
  },
  {
    slug: 'services',
    tile: 'blue',
    icon: 'text',
    key: 'S',
    // A guest may not see the archive, so its button is absent.
    actions: [{ window: 'archive', label: { en: 'Archive', de: 'Archiv' } }],
    title: { en: 'Services', de: 'Leistungen' },
    description: {
      en: 'A fixture window for a second app.',
      de: 'Ein Beispielfenster für eine zweite App.',
    },
    sections: (ids) => ({
      en: indexed(ids, {
        title: 'Services',
        lead: 'A fixture window for a second app. Its lead paragraph opens the window and says what the visitor will find in it.',
        index: [
          ['A first part', 'Which question does the first part answer?'],
          [
            'A second part',
            'Which question does the second part answer, in a line long enough to wrap?',
          ],
          ['A third part', 'Which question leads away from the site?'],
        ],
        when: 'When it fits, in one sentence.\nWhat it holds, as a list of words',
      }),
      de: indexed(ids, {
        title: 'Leistungen',
        lead: 'Ein Beispielfenster für eine zweite App. Sein Vorspann öffnet das Fenster und sagt, was Besucher darin finden.',
        index: [
          ['Ein erster Teil', 'Welche Frage beantwortet der erste Teil?'],
          [
            'Ein zweiter Teil',
            'Welche Frage beantwortet der zweite Teil, in einer Zeile, die umbricht?',
          ],
          ['Ein dritter Teil', 'Welche Frage führt von der Seite weg?'],
        ],
        when: 'Wann er passt, in einem Satz.\nWas er enthält, als Liste von Wörtern',
      }),
    }),
  },
  {
    slug: 'cv',
    kind: 'pdf',
    tile: 'paper',
    icon: 'file',
    key: 'C',
    paper: true,
    stamp: 'FIX/CV.01',
    width: 800,
    height: 1114,
    actions: [
      { file: true, label: { en: 'Download', de: 'Herunterladen' } },
      { window: 'contact', label: { en: 'Write', de: 'Schreiben' } },
    ],
    title: { en: 'CV', de: 'Lebenslauf' },
    description: {
      en: 'A fixture window for a document.',
      de: 'Ein Beispielfenster für ein Dokument.',
    },
    sections: () => ({
      en: record({
        title: 'CV',
        lead: 'A fixture window for a document, its rows in headed groups.',
        end: 'Kind',
        groups: [
          [
            'A group',
            [
              [
                'A role',
                'A place',
                'What was done there, in a sentence long enough to wrap in a narrow window.',
                'A kind',
              ],
              ['Another role', 'Another place', 'What was done there.', 'Another kind'],
            ],
          ],
          ['Another group', [['A third role', 'A third place', 'What was done there.', 'A kind']]],
        ],
        facts: [
          'A group of facts',
          [
            ['A label', 'Its value'],
            ['Another label', 'Another value'],
          ],
        ],
      }),
      de: record({
        title: 'Lebenslauf',
        lead: 'Ein Beispielfenster für ein Dokument, seine Zeilen in Gruppen mit Kopf.',
        end: 'Art',
        groups: [
          [
            'Eine Gruppe',
            [
              [
                'Eine Rolle',
                'Ein Ort',
                'Was dort getan wurde, in einem Satz, der in einem schmalen Fenster umbricht.',
                'Eine Art',
              ],
              ['Eine andere Rolle', 'Ein anderer Ort', 'Was dort getan wurde.', 'Eine andere Art'],
            ],
          ],
          [
            'Eine andere Gruppe',
            [['Eine dritte Rolle', 'Ein dritter Ort', 'Was dort getan wurde.', 'Eine Art']],
          ],
        ],
        facts: [
          'Eine Gruppe von Angaben',
          [
            ['Eine Angabe', 'Ihr Wert'],
            ['Eine andere Angabe', 'Ein anderer Wert'],
          ],
        ],
      }),
    }),
  },
  {
    slug: 'contact',
    tile: 'raised',
    icon: 'mail',
    key: 'K',
    paper: true,
    stamp: 'FIX/MSG.01',
    oneSize: true,
    width: 640,
    height: 512,
    title: { en: 'Contact', de: 'Kontakt' },
    description: {
      en: 'A fixture window for a form.',
      de: 'Ein Beispielfenster für ein Formular.',
    },
    sections: (ids) => ({
      en: [{ blockType: 'form', form: ids.form }],
      de: [{ blockType: 'form', form: ids.form }],
    }),
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
    stamp: 'FIX/IMP.01',
    width: 1000,
    height: 992,
    title: { en: 'Imprint', de: 'Impressum' },
    description: {
      en: 'A placeholder: the imprint is written in the admin.',
      de: 'Ein Platzhalter: Das Impressum entsteht im Admin.',
    },
    aside: {
      type: 'record',
      title: { en: 'A record', de: 'Ein Vermerk' },
      facts: {
        en: [
          ['A label', 'Its value'],
          ['Another label', 'A value long enough to wrap onto a second line in a narrow card'],
        ],
        de: [
          ['Eine Angabe', 'Ihr Wert'],
          ['Eine andere Angabe', 'Ein Wert, lang genug, um in einer schmalen Karte umzubrechen'],
        ],
      },
      actions: [
        { url: 'mailto:site@example.com', label: { en: 'Write', de: 'Schreiben' } },
        { url: 'tel:+10000000000', label: { en: 'Call', de: 'Anrufen' } },
      ],
    },
    sections: () => ({
      en: chaptered({
        title: 'Imprint',
        lead: 'A placeholder: the imprint is written in the admin.',
        short: 'A group of facts',
        chapters: [],
      }),
      de: chaptered({
        title: 'Impressum',
        lead: 'Ein Platzhalter: Das Impressum entsteht im Admin.',
        short: 'Eine Gruppe von Angaben',
        chapters: [],
      }),
    }),
  },
  {
    slug: 'privacy-policy',
    kind: 'txt',
    stamp: 'FIX/PRV.01',
    width: 1120,
    height: 900,
    title: { en: 'Privacy', de: 'Datenschutz' },
    description: {
      en: 'A placeholder: the privacy policy is written in the admin.',
      de: 'Ein Platzhalter: Die Datenschutzerklärung entsteht im Admin.',
    },
    aside: { type: 'contents' },
    sections: () => ({
      en: chaptered({
        title: 'Privacy',
        lead: 'A placeholder: the privacy policy is written in the admin.',
        short: 'In short',
        chapters: ['A first chapter', 'A second chapter', 'A third chapter', 'A fourth chapter'],
      }),
      de: chaptered({
        title: 'Datenschutz',
        lead: 'Ein Platzhalter: Die Datenschutzerklärung entsteht im Admin.',
        short: 'Kurz gesagt',
        chapters: [
          'Ein erstes Kapitel',
          'Ein zweites Kapitel',
          'Ein drittes Kapitel',
          'Ein viertes Kapitel',
        ],
      }),
    }),
  },
  {
    slug: '404',
    title: { en: 'Not found', de: 'Nicht gefunden' },
    description: { en: 'Nothing is at this address.', de: 'Unter dieser Adresse ist nichts.' },
    sections: (ids, { lost }) => ({
      en: [{ blockType: 'media', columns: '1', ratio: '16:9', items: [{ picture: lost }] }],
    }),
  },
]

const trusted = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const

const FILE = 'fixture.txt'

// One form in both languages: its fields are shared, their labels are written in each.
const FORM = 'A fixture form'
const formFields = {
  en: { name: 'Name', email: 'Email', subject: 'Subject', message: 'Message' },
  de: { name: 'Name', email: 'E-Mail', subject: 'Betreff', message: 'Nachricht' },
}
const subjects = {
  en: ['A first subject', 'A second subject', 'A third subject', 'Something else'],
  de: ['Ein erster Betreff', 'Ein zweiter Betreff', 'Ein dritter Betreff', 'Etwas anderes'],
}

async function fixtureForm(payload: Payload): Promise<number> {
  const {
    docs: [found],
  } = await payload.find({
    collection: 'forms',
    limit: 1,
    locale: 'en',
    pagination: false,
    where: { title: { equals: FORM } },
    ...trusted,
  })
  const fields = (language: 'en' | 'de', ids?: (string | null | undefined)[]) => {
    const label = formFields[language]
    return [
      { blockType: 'text' as const, name: 'name', label: label.name, width: 100 },
      { blockType: 'email' as const, name: 'email', label: label.email, required: true },
      {
        blockType: 'radio' as const,
        name: 'subject',
        label: label.subject,
        options: subjects[language].map((one, at) => ({ label: one, value: `subject-${at}` })),
      },
      { blockType: 'textarea' as const, name: 'message', label: label.message, required: true },
    ].map((field, at) => ({ ...field, id: ids?.[at] }))
  }
  const english = { title: FORM, fields: fields('en'), submitButtonLabel: 'Send' }
  const made = found
    ? await payload.update({
        collection: 'forms',
        id: found.id,
        data: english,
        locale: 'en',
        ...trusted,
      })
    : await payload.create({ collection: 'forms', data: english, locale: 'en', ...trusted })
  // The blocks are kept by their ids, so the German labels land on the same fields.
  const ids = (made.fields ?? []).map(({ id }) => id)
  const options = (made.fields ?? []).map((field) =>
    field.blockType === 'radio' ? (field.options ?? []).map(({ id }) => id) : [],
  )
  await payload.update({
    collection: 'forms',
    id: made.id,
    data: {
      title: FORM,
      submitButtonLabel: 'Senden',
      fields: fields('de', ids).map((field, at) =>
        field.blockType === 'radio'
          ? {
              ...field,
              options: field.options.map((option, index) => ({
                ...option,
                id: options[at][index],
              })),
            }
          : field,
      ),
    },
    locale: 'de',
    ...trusted,
  })
  return made.id
}

// One neutral file for a button to download, made once.
async function document(payload: Payload): Promise<number> {
  const {
    docs: [found],
  } = await payload.find({
    collection: 'media',
    limit: 1,
    pagination: false,
    where: { filename: { equals: FILE } },
    ...trusted,
  })
  if (found) return found.id
  const data = Buffer.from('A fixture file.\n')
  const { id } = await payload.create({
    collection: 'media',
    data: { alt: 'A fixture file' },
    file: { data, mimetype: 'text/plain', name: FILE, size: data.length },
    ...trusted,
  })
  return id
}

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
  for (const {
    slug,
    parent,
    title,
    description,
    listing,
    sections: _sections,
    actions: _actions,
    aside,
    ...shared
  } of windows) {
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
      ...(aside && {
        aside:
          aside.type === 'record'
            ? {
                type: aside.type,
                title: aside.title[language],
                facts: aside.facts[language].map(([label, value]) => ({ label, value })),
                actions: aside.actions.map(({ url, label }) => ({
                  type: 'address' as const,
                  url,
                  label: label[language],
                })),
              }
            : aside,
      }),
      ...(listing && {
        caption: listing.caption[language],
        headline: listing.headline[language],
        note: listing.note[language],
        facts: listing.facts[language]?.map(([label, value]) => ({ label, value })),
      }),
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
  ids.form = await fixtureForm(payload)
  const shown = {
    still: await upload(payload, { alt: 'A sun setting over two hills' }),
    live: await upload(payload, { alt: 'A sun drawn in dots', live: 'portrait' }),
    lost: await upload(payload, { alt: 'The numerals 404 in dots', live: 'not-found' }),
  }
  for (const { slug, sections, listing } of windows) {
    // Every window has a picture to share.
    await payload.update({
      collection: 'windows',
      id: ids[slug],
      data: {
        cover: shown.still,
        ...(listing && { related: listing.related.map((one) => ids[one]) }),
      },
      locale: 'en',
      ...trusted,
    })
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

  // The buttons point at windows made above, so they are set once every window is there.
  const download = await document(payload)
  for (const { slug, title, actions } of windows) {
    if (!actions) continue
    for (const language of title.de ? (['en', 'de'] as const) : (['en'] as const)) {
      const buttons = actions.map((button) => ({
        type: button.window ? 'window' : button.file ? 'media' : 'address',
        window: button.window ? ids[button.window] : null,
        media: button.file ? download : null,
        url: button.url ?? null,
        label: button.label?.[language] ?? null,
      }))
      await payload.update({
        collection: 'windows',
        id: ids[slug],
        data: { actions: buttons, _status: 'published' } as Window,
        locale: language,
        ...trusted,
      })
    }
  }

  // About counts the work, and behind its plate leads to the contact and the CV windows.
  const about = {
    en: [
      ['Made in', 'Somewhere'],
      ['Input', 'Questions'],
      ['Output', 'Answers'],
      ['Display', 'A fixture fact'],
      ['Operator', 'A name'],
    ],
    de: [
      ['Hergestellt in', 'Irgendwo'],
      ['Eingabe', 'Fragen'],
      ['Ausgabe', 'Antworten'],
      ['Anzeige', 'Ein Beispielfakt'],
      ['Bediener', 'Ein Name'],
    ],
  }
  const inside = {
    en: {
      title: 'A heading behind the plate.',
      text: 'One sentence behind the plate.',
      write: 'Write',
    },
    de: {
      title: 'Eine Überschrift hinter dem Schild.',
      text: 'Ein Satz hinter dem Schild.',
      write: 'Schreiben',
    },
  }
  for (const locale of ['en', 'de'] as const)
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Dimm OS',
        email: 'site@example.com',
        place: 'Somewhere',
        timezone: 'Europe/London',
        counted: ids.work,
        about: about[locale].map(([label, value]) => ({ label, value })),
        boot: [1, 2, 3].map((n) => ({
          label: `${locale === 'en' ? 'Device' : 'Gerät'} ${n}`,
          value: locale === 'en' ? 'What it found' : 'Was es fand',
          status: 'OK',
        })),
        inside: {
          picture: shown.live,
          title: inside[locale].title,
          text: inside[locale].text,
          actions: [
            { type: 'window', window: ids.contact, label: inside[locale].write },
            { type: 'window', window: ids.cv },
          ],
        },
      },
      // Its relations are checked against what a guest may read, as the site reads them.
      context: { viewer: null },
      locale,
      ...trusted,
    })
  return ids
}
