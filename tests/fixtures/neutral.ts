import type { Payload } from 'payload'

import type { Window } from '@/payload-types'

// Words in English and, where it is written, in German.
type Words = { en: string; de?: string }

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
> & { slug: string; parent?: string; title: Words; description: Words; actions?: Button[] }

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
  },
  {
    slug: 'field',
    parent: 'work',
    kind: 'case',
    title: { en: 'Field', de: 'Feld' },
    description: { en: 'A second fixture item.', de: 'Ein zweiter Beispieleintrag.' },
  },
  {
    slug: 'loop',
    parent: 'work',
    kind: 'case',
    title: { en: 'Loop' },
    description: { en: 'A fixture item not yet written in German.' },
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
    // A guest may not see the archive: the button keeps its label and goes nowhere.
    actions: [{ window: 'archive', label: { en: 'Archive', de: 'Archiv' } }],
    title: { en: 'Services', de: 'Leistungen' },
    description: {
      en: 'A fixture window for a second app.',
      de: 'Ein Beispielfenster für eine zweite App.',
    },
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

const FILE = 'fixture.txt'

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

// Makes the fixture's windows, or brings them back to it, each published in the languages it is written in.
export async function fill(payload: Payload): Promise<Record<string, number>> {
  const ids: Record<string, number> = {}
  for (const { slug, parent, title, description, actions: _, ...shared } of windows) {
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

  // The buttons point at windows made above, so they are set once every window is there.
  const file = await document(payload)
  for (const { slug, title, actions } of windows) {
    if (!actions) continue
    for (const language of title.de ? (['en', 'de'] as const) : (['en'] as const)) {
      const buttons = actions.map((button) => ({
        type: button.window ? 'window' : button.file ? 'media' : 'address',
        window: button.window ? ids[button.window] : null,
        media: button.file ? file : null,
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
