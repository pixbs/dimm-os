import 'server-only'

import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { revalidateTag, unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'

import type { Shortcut, Tile } from '@/ds/organisms/Screen'
import { hasLanguage, type Language, languages, toAddress } from '@/i18n/address'

import { site, visitor, windows } from './fixture'
import { VISITOR_COOKIE } from './viewer'

type Link = { href: string; title: string }

type Section = { type: 'text'; html: string } | { type: 'list'; items: Link[] }

export type WindowView = {
  path: string
  // The tile of the window's app marks it in the taskbar; one size means no full screen and nothing to pull.
  frame: { title: string; kind: string | null; tile: Tile | null; oneSize?: boolean }
  sections: Section[]
  counters: { position: number; total: number }
  neighbours: { previous: Link | null; next: Link | null }
}

export type View = {
  language: Language
  site: typeof site
  shortcuts: Shortcut[]
  window: WindowView | null
}

// Null is a guest; a visitor carries the hidden windows the invitation opens.
type Viewer = { windows: string[] } | null

// One tag covers every view, because lists, counters and neighbours read many documents.
const TAG = 'views'

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/'

export async function getWindowView(
  path: string,
  language: Language,
  viewer: Viewer,
): Promise<View | null> {
  const visible = windows.filter(
    (window) => !window.hidden || viewer?.windows.includes(window.path),
  )
  const itemsOf = (parent: string) => visible.filter((window) => parentOf(window.path) === parent)
  const link = (window: (typeof windows)[number]): Link => ({
    href: toAddress(language, window.path),
    title: window.title[language],
  })

  // A file's shortcut is named with its kind: CV.pdf.
  const shortcuts = itemsOf('/').flatMap(({ path, title, kind, icon, tile }) =>
    icon
      ? [
          {
            href: toAddress(language, path),
            name: title[language] + (kind ? `.${kind}` : ''),
            icon,
            tile,
          },
        ]
      : [],
  )
  if (path === '/') return { language, site, shortcuts, window: null }

  const found = visible.find((window) => window.path === path)
  if (!found) return null

  const items = itemsOf(path)
  const siblings = itemsOf(parentOf(path))
  const position = siblings.indexOf(found)
  const previous = siblings[position - 1]
  const next = siblings[position + 1]

  const app = windows.find((window) => window.path === `/${path.split('/')[1]}`)

  return {
    language,
    site,
    shortcuts,
    window: {
      path,
      frame: { title: found.title[language], kind: found.kind, tile: app?.tile ?? null },
      sections: [
        {
          type: 'text',
          html: convertLexicalToHTML({ data: found.body[language], disableContainer: true }),
        },
        ...(items.length ? [{ type: 'list' as const, items: items.map(link) }] : []),
      ],
      counters: { position: position + 1, total: siblings.length },
      neighbours: {
        previous: previous ? link(previous) : null,
        next: next ? link(next) : null,
      },
    },
  }
}

const getGuestView = unstable_cache(
  (path: string, language: Language) => getWindowView(path, language, null),
  ['view'],
  { tags: [TAG] },
)

// The view for whoever asks, from a route's segments: cached for a guest, made anew for a visitor.
export async function getView(lang: string, segments: string[] = []): Promise<View | null> {
  if (!hasLanguage(lang)) return null

  const path = `/${segments.join('/')}`
  return (await cookies()).has(VISITOR_COOKIE)
    ? getWindowView(path, lang, visitor)
    : getGuestView(path, lang)
}

// Every address a guest can open, so that the build renders it ahead of the first request.
export function generateStaticParams() {
  const paths = ['/', ...windows.filter((window) => !window.hidden).map((window) => window.path)]
  return languages.flatMap((lang) =>
    paths.map((path) => ({ lang, path: path.split('/').filter(Boolean) })),
  )
}

// The old view answers once more while the new one renders.
export function revalidateViews(): void {
  revalidateTag(TAG, 'max')
}
