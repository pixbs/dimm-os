import 'server-only'

import config from '@payload-config'
import { buildDefaultEditorState } from '@payloadcms/richtext-lexical'
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { revalidateTag, unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import type { Shortcut, Tile } from '@/ds/organisms/Screen'
import { hasLanguage, type Language, languages, toAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'
import type { Visitor, Window } from '@/payload-types'
import type { AppKey } from '@/shell/keys'
import { systemWindows } from '@/system/windows'

import { VISITOR_COOKIE } from './viewer'

// A part shown in another language than the page's carries that language.
type Link = { href: string; title: string; lang?: Language }

type Section = { type: 'text'; html: string } | { type: 'list'; items: Link[] }

// A button at a window's foot: to a window, with its letter where it has one; to a file, which downloads; or to an
// address. One to a window this viewer may not see keeps its label and goes nowhere.
export type FootButton = {
  to: 'window' | 'media' | 'address'
  label: string
  href: string | null
  key?: string
  lang?: Language
}

export type WindowView = {
  path: string
  // The address the 404 window answers, which its bar shows.
  asked?: string
  lang?: Language
  // The tile of the window's app marks it in the taskbar; one size means no full screen and nothing to pull. Its
  // size on a desk is a maximum. Paper draws it as a record, opened by its stamp: the code and the place.
  frame: {
    title: string
    kind: string | null
    tile: Tile | null
    oneSize?: boolean
    size?: { w?: number; h?: number }
    paper?: boolean
    stamp?: { code: string; place: string }
  }
  sections: Section[]
  actions: FootButton[]
  // How many items it has, and as an item, which shows in its parent's window: the way back, its place among
  // the items, and the items beside it.
  count: number
  parent: Link | null
  counters: { position: number; total: number } | null
  neighbours: { previous: Link | null; next: Link | null }
}

export type View = {
  language: Language
  site: { name: string; timezone: string; place: string }
  shortcuts: Shortcut[]
  keys: AppKey[]
  // The window of the address; at / there is none, and the windows marked to open at start.
  window: WindowView | null
  start: WindowView[]
}

// Null is a guest; a visitor carries the hidden windows the invitation opens.
type Viewer = Visitor | null

// One tag covers every view, because lists, counters and neighbours read many documents.
const TAG = 'views'

// German that is not written yet shows the English, except in the two legal windows.
const english: Language = 'en'
const legal = ['imprint', 'privacy-policy']
// The 404 window answers every address that has nothing, and has none of its own.
const missing = '404'

const fields = {
  _order: true,
  title: true,
  slug: true,
  parent: true,
  kind: true,
  tile: true,
  icon: true,
  key: true,
  oneSize: true,
  openAtStart: true,
  description: true,
  paper: true,
  stamp: true,
  width: true,
  height: true,
  actions: true,
} as const

type Doc = Pick<Window, keyof typeof fields | 'id'>

// A window as this viewer sees it: its words, the language they are in, its path and its parent.
type Seen = { doc: Doc; lang: Language; path: string; parent?: Seen }

const parentOf = ({ parent }: Doc) => (typeof parent === 'object' && parent ? parent.id : null)

async function read(locale: Language, viewer: Viewer): Promise<Doc[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'windows',
    // The read rule of Windows answers the site's own code for the viewer it names.
    context: { viewer },
    depth: 1,
    draft: false,
    fallbackLocale: false,
    locale,
    overrideAccess: false,
    pagination: false,
    populate: { windows: { slug: true }, media: { url: true, filename: true } },
    select: fields,
    sort: '_order',
  })
  return docs as Doc[]
}

// Every window this viewer may see in a language, in their order. An item sits under its parent where the
// parent is seen too, and stands alone where it is not.
async function seen(language: Language, viewer: Viewer): Promise<Seen[]> {
  const [own, other] = await Promise.all([
    read(language, viewer),
    language === english ? [] : read(english, viewer),
  ])
  const ids = new Set(own.map((doc) => doc.id))
  // A parent not written in this language is still the parent the English names.
  const parents = new Map(other.map((doc) => [doc.id, parentOf(doc)]))
  const all = [
    ...own.map((doc) => ({ doc, lang: language })),
    ...other
      .filter((doc) => !ids.has(doc.id) && !legal.includes(doc.slug))
      .map((doc) => ({ doc, lang: english })),
  ].sort((a, b) => {
    const [x, y] = [a.doc._order ?? '', b.doc._order ?? '']
    return x < y ? -1 : x > y ? 1 : 0
  })

  const byId = new Map(all.map((one) => [one.doc.id, one]))
  return all.map(({ doc, lang }) => {
    const parent = byId.get(parentOf(doc) ?? parents.get(doc.id) ?? NaN)?.doc
    return {
      doc,
      lang,
      path: parent ? `/${parent.slug}/${doc.slug}` : `/${doc.slug}`,
    }
  })
}

const site = async (language: Language, viewer: Viewer) => {
  const payload = await getPayload({ config })
  const { name, timezone, place } = await payload.findGlobal({
    slug: 'site',
    context: { viewer },
    depth: 1,
    draft: false,
    fallbackLocale: false,
    locale: language,
    overrideAccess: false,
    select: { name: true, timezone: true, place: true },
  })
  return { name: name ?? '', timezone: timezone ?? 'UTC', place: place ?? '' }
}

// The view of every window at its path, for one viewer in one language, and of the 404 window.
async function views(language: Language, viewer: Viewer) {
  const [windows, about, t] = await Promise.all([
    seen(language, viewer),
    site(language, viewer),
    getDictionary(language),
  ])
  // The system's windows have no document: their views arrive with them, and here their paths resolve.
  const system = Object.entries(systemWindows).map(([path, word]) => ({
    doc: {
      slug: path.split('/').pop()!,
      kind: 'sys',
      title: word === 'about' ? t.about.replace('{name}', about.name) : t[word],
    } as Doc,
    lang: language,
    path,
  }))

  const all: Seen[] = [...windows, ...system]
  const byPath = new Map(all.map((one) => [one.path, one]))
  for (const one of all) one.parent = byPath.get(one.path.slice(0, one.path.lastIndexOf('/')))
  const itemsOf = (parent: Seen) => all.filter((one) => one.parent === parent)
  const other = (lang: Language) => (lang === language ? undefined : lang)
  const link = ({ path, doc, lang }: Seen): Link => ({
    href: toAddress(language, path),
    title: doc.title,
    lang: other(lang),
  })
  const byId = new Map(windows.map((one) => [one.doc.id, one]))
  // A link to a window this viewer may see shows its title when its label is empty, and its letter.
  const button = (action: NonNullable<Doc['actions']>[number]): FootButton[] => {
    const to = action.type ?? 'window'
    const label = action.label ?? ''
    if (to === 'window') {
      const target = typeof action.window === 'object' ? byId.get(action.window?.id ?? NaN) : null
      if (!target) return label ? [{ to, label, href: null }] : []
      return [
        {
          to,
          label: label || target.doc.title,
          href: toAddress(language, target.path),
          key: target.doc.key ?? undefined,
          lang: label ? undefined : other(target.lang),
        },
      ]
    }
    const href = to === 'media' ? typeof action.media === 'object' && action.media?.url : action.url
    if (!href || !label) return []
    // A file in the store is on another origin, where only the store's own flag makes it a download.
    const stored = to === 'media' && /\.blob\.vercel-storage\.com\//.test(href)
    return [{ to, label, href: stored ? `${href}?download=1` : href }]
  }
  const html = (text: string) =>
    convertLexicalToHTML({ data: buildDefaultEditorState({ text }), disableContainer: true })

  const view = (one: Seen): WindowView => {
    const { doc, parent } = one
    const app = parent ?? one
    const items = itemsOf(one)
    const siblings = parent ? itemsOf(parent) : []
    const at = siblings.indexOf(one)
    const beside = (step: number) => (siblings[at + step] ? link(siblings[at + step]) : null)
    return {
      path: one.path,
      lang: other(one.lang),
      frame: {
        title: doc.title,
        kind: doc.kind ?? null,
        tile: app.doc.tile ?? null,
        oneSize: app.doc.oneSize ?? undefined,
        size: { w: app.doc.width ?? undefined, h: app.doc.height ?? undefined },
        paper: doc.paper ?? undefined,
        stamp: doc.paper && doc.stamp ? { code: doc.stamp, place: about.place } : undefined,
      },
      actions: (doc.actions ?? []).flatMap(button),
      sections: [
        ...(doc.description ? [{ type: 'text' as const, html: html(doc.description) }] : []),
        ...(items.length ? [{ type: 'list' as const, items: items.map(link) }] : []),
      ],
      count: items.length,
      parent: parent ? link(parent) : null,
      counters: parent ? { position: at + 1, total: siblings.length } : null,
      neighbours: { previous: parent ? beside(-1) : null, next: parent ? beside(1) : null },
    }
  }

  const shown = windows.filter((one) => one.doc.slug !== missing)
  const notFound = windows.find((one) => one.doc.slug === missing)
  // A file's shortcut is named with its kind: CV.pdf.
  const shortcuts = shown.flatMap(({ doc, path, lang, parent }) =>
    doc.icon && !parent
      ? [
          {
            href: toAddress(language, path),
            name: doc.title + (doc.kind ? `.${doc.kind}` : ''),
            icon: doc.icon,
            tile: doc.tile ?? null,
            lang: other(lang),
          },
        ]
      : [],
  )
  const desk = {
    language,
    site: about,
    shortcuts,
    keys: shown.flatMap(({ doc, path }) => (doc.key ? [{ key: doc.key, path }] : [])),
  }
  const at = (window: WindowView | null, start: WindowView[] = []): View => ({
    ...desk,
    window,
    start,
  })

  return {
    paths: shown.map((one) => one.path),
    // What a path shows: its window, the desk with the windows that open at start, or the one it moved to.
    at(path: string): View | { moved: string } | null {
      if (path === '/')
        return at(null, shown.filter((one) => !one.parent && one.doc.openAtStart).map(view))
      const found = byPath.get(path)
      if (found && found.doc.slug !== missing) return at(view(found))
      // Slugs are unique, so a known window under an old parent is found by its own.
      const moved = shown.find((one) => one.doc.slug === path.split('/').pop())
      return moved ? { moved: moved.path } : null
    },
    missing: () => at(notFound ? view(notFound) : null),
  }
}

// The view of an address, or the address its window moved to, or null where this viewer has nothing.
export async function getWindowView(path: string, language: Language, viewer: Viewer) {
  return (await views(language, viewer)).at(path)
}

// Keyed by deployment, as the cache outlives one: a deployment that changes what a view holds never reads an older view.
const key = ['view', process.env.VERCEL_DEPLOYMENT_ID ?? '']
const getGuestView = unstable_cache(
  (path: string, language: Language) => getWindowView(path, language, null),
  key,
  { tags: [TAG] },
)
const getGuestMissing = unstable_cache(
  async (language: Language) => (await views(language, null)).missing(),
  [...key, missing],
  { tags: [TAG] },
)

// Holding the cookie names no visitor until the login arrives: its holder reads as a guest, uncached.
const visiting = async () => (await cookies()).has(VISITOR_COOKIE)

// The view for whoever asks, from a route's segments: cached for a guest, made anew for a visitor.
export async function getView(lang: string, segments: string[] = []) {
  if (!hasLanguage(lang)) return null

  const path = `/${segments.join('/')}`
  return (await visiting()) ? getWindowView(path, lang, null) : getGuestView(path, lang)
}

// The desk with the 404 window.
export async function getMissingView(language: Language): Promise<View> {
  return (await visiting()) ? (await views(language, null)).missing() : getGuestMissing(language)
}

// Every address a guest can open, so that the build renders it ahead of the first request.
export async function generateStaticParams() {
  const all = await Promise.all(
    languages.map(async (lang) => {
      const { paths } = await views(lang, null)
      return ['/', ...paths, ...Object.keys(systemWindows)].map((path) => ({
        lang,
        path: path.split('/').filter(Boolean),
      }))
    }),
  )
  return all.flat()
}

// No view outlives a change, so a window hidden or unpublished is gone at the next request.
export function revalidateViews(): void {
  revalidateTag(TAG, { expire: 0 })
}
