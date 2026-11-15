import 'server-only'

import { buildDefaultEditorState } from '@payloadcms/richtext-lexical'

// The windows of the spike stand in for the content model, with rich text as Payload stores it.
export const windows = [
  {
    path: '/work',
    hidden: false,
    kind: null,
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
]

// The visitor of the spike stands in for the login, and may open the hidden window.
export const visitor = { windows: ['/work/vault'] }
