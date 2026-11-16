import 'server-only'

import { buildDefaultEditorState } from '@payloadcms/richtext-lexical'

import type { IconName } from '@/ds/atoms/Icon'
import type { Tile } from '@/ds/organisms/Screen'
import type { Language } from '@/i18n/address'

const text = (en: string, de: string) => ({
  en: buildDefaultEditorState({ text: en }),
  de: buildDefaultEditorState({ text: de }),
})

// What Site will hold: the name in the menu bar, and the zone of its clock.
export const site = { name: 'Dimm OS', timezone: 'Europe/Berlin' }

type Window = {
  path: string
  hidden: boolean
  kind: string | null
  tile: Tile | null
  icon: IconName | null
  // The letter that opens it.
  key?: string
  title: Record<Language, string>
  body: ReturnType<typeof text>
}

// The windows of the spike stand in for the content model, with rich text as Payload stores it. A window
// with an icon has a shortcut on the desk.
export const windows: Window[] = [
  {
    path: '/work',
    hidden: false,
    kind: null,
    tile: 'orange',
    icon: 'grid',
    key: 'W',
    title: { en: 'Work', de: 'Arbeit' },
    body: {
      en: buildDefaultEditorState({ text: 'A fixture window that lists its items.' }),
      de: buildDefaultEditorState({ text: 'Ein Beispielfenster, das seine Einträge auflistet.' }),
    },
  },
  {
    path: '/work/grow',
    hidden: false,
    kind: 'case',
    tile: null,
    icon: null,
    title: { en: 'Grow', de: 'Grow' },
    body: {
      en: buildDefaultEditorState({ text: 'A fixture item that every guest may open.' }),
      de: buildDefaultEditorState({ text: 'Ein Beispieleintrag, den jeder Gast öffnen darf.' }),
    },
  },
  {
    path: '/work/vault',
    hidden: true,
    kind: 'case',
    tile: null,
    icon: null,
    title: { en: 'Vault', de: 'Tresor' },
    body: {
      en: buildDefaultEditorState({
        text: 'A fixture item that only an invited visitor may open.',
      }),
      de: buildDefaultEditorState({
        text: 'Ein Beispieleintrag, den nur eingeladene Besucher öffnen dürfen.',
      }),
    },
  },
  {
    path: '/services',
    hidden: false,
    kind: null,
    tile: 'blue',
    icon: 'text',
    title: { en: 'Services', de: 'Leistungen' },
    body: text('A fixture window for a second app.', 'Ein Beispielfenster für eine zweite App.'),
  },
  {
    path: '/cv',
    hidden: false,
    kind: 'pdf',
    tile: 'paper',
    icon: 'file',
    title: { en: 'CV', de: 'Lebenslauf' },
    body: text('A fixture window for a document.', 'Ein Beispielfenster für ein Dokument.'),
  },
  {
    path: '/contact',
    hidden: false,
    kind: null,
    tile: 'raised',
    icon: 'mail',
    title: { en: 'Contact', de: 'Kontakt' },
    body: text('A fixture window for a form.', 'Ein Beispielfenster für ein Formular.'),
  },
  // The windows the menus, the tray and the phone's home link to, until the system and the admin bring theirs.
  ...(
    [
      ['/imprint', 'txt', 'Imprint', 'Impressum'],
      ['/privacy-policy', 'txt', 'Privacy', 'Datenschutz'],
      ['/cookies', 'sys', 'Cookies', 'Cookies'],
      ['/preferences', 'sys', 'Preferences', 'Einstellungen'],
      ['/hotkeys', 'sys', 'Hotkeys', 'Tastenkürzel'],
    ] as const
  ).map(([path, kind, en, de]) => ({
    path,
    hidden: false,
    kind,
    tile: null,
    icon: null,
    title: { en, de },
    body: text(
      `A fixture window that stands for “${en}”.`,
      `Ein Beispielfenster, das für „${de}“ steht.`,
    ),
  })),
]

// The visitor of the spike stands in for the login, and may open the hidden window.
export const visitor = { windows: ['/work/vault'] }
