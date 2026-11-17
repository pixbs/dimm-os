import 'server-only'

import config from '@payload-config'
import type { LinkFields } from '@payloadcms/richtext-lexical'
import {
  convertLexicalToHTML,
  defaultHTMLConverters,
  type HTMLConverter,
  type HTMLConverters,
} from '@payloadcms/richtext-lexical/html'
import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical'
import { revalidateTag, unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import { sanitizeUrl } from 'payload/shared'

import { cards, type CardsView } from '@/blocks/cards/view'
import { facts, type FactsView } from '@/blocks/facts/view'
import { type Action, type Button, header, type HeaderView } from '@/blocks/header/view'
import { list, type ListView } from '@/blocks/list/view'
import type { Listed, Listing } from '@/blocks/listing'
import { media, type MediaView } from '@/blocks/media/view'
import { quote, type QuoteView } from '@/blocks/quote/view'
import { stats, type StatsView } from '@/blocks/stats/view'
import { table, type TableView } from '@/blocks/table/view'
import { text, type TextView } from '@/blocks/text/view'
import { icons } from '@/ds/atoms/icons'
import type { Shortcut, Tile } from '@/ds/organisms/Screen'
import { hasLanguage, type Language, languages, toAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'
import type { Media, Visitor, Window } from '@/payload-types'
import type { AppKey } from '@/shell/keys'
import { oneSize, systemWindows } from '@/system/windows'

import { VISITOR_COOKIE } from './viewer'

// A part shown in another language than the page's carries that language.
type Link = { href: string; title: string; lang?: Language }

// The sections the admin placed.
type Section =
  | HeaderView
  | TextView
  | MediaView
  | StatsView
  | QuoteView
  | FactsView
  | TableView
  | ListView
  | CardsView

// The sections whose body a joined section can continue under their heading; tiles have none.
const joinable = new Set(['text', 'stats', 'facts', 'table', 'list', 'cards'])
const continued = (section?: Section | null) =>
  Boolean(section && joinable.has(section.type) && !(section.type === 'cards' && section.tiles))

export type WindowView = {
  path: string
  // The address the 404 window answers, which its bar shows.
  asked?: string
  lang?: Language
  // A window of a hidden app, which no device keeps.
  hidden?: boolean
  // The tile of the window's app marks it in the taskbar; one size means no full screen and nothing to pull.
  frame: { title: string; kind: string | null; tile: Tile | null; oneSize?: boolean }
  sections: Section[]
  // How many items it has, and as an item, which shows in its parent's window: the way back, its place among
  // the items, and the items beside it.
  count: number
  parent: Link | null
  counters: { position: number; total: number } | null
  neighbours: { previous: Link | null; next: Link | null }
}

export type View = {
  language: Language
  site: { name: string; timezone: string }
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

type LinkNode = { type: 'link' | 'autolink'; children: SerializedLexicalNode[]; fields: LinkFields }

// An address goes into an attribute of the HTML a view carries.
const escape = (value: string) => value.replace(/[&"<>]/g, (char) => `&#${char.charCodeAt(0)};`)

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
  hidden: true,
  sections: true,
  description: true,
  cover: true,
  caption: true,
  headline: true,
  note: true,
  facts: true,
  related: true,
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
    populate: {
      // A file's address is made from its name and folder.
      media: {
        url: true,
        filename: true,
        prefix: true,
        alt: true,
        focalX: true,
        focalY: true,
        live: true,
      },
      windows: { slug: true },
    },
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
  const { name, timezone } = await payload.findGlobal({
    slug: 'site',
    context: { viewer },
    depth: 1,
    draft: false,
    fallbackLocale: false,
    locale: language,
    overrideAccess: false,
    select: { name: true, timezone: true },
  })
  return { name: name ?? '', timezone: timezone ?? 'UTC' }
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
      oneSize: path in oneSize,
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
  // A window this viewer may see, from a relation or a link in running text, which carries its id or itself.
  const byId = new Map(windows.map((one) => [one.doc.id, one]))
  const linkTo = (value: unknown) => {
    const found = byId.get(typeof value === 'object' && value ? (value as Doc).id : Number(value))
    return found ? link(found) : null
  }
  // The windows a document relates to that this viewer may see, in their order, as buttons to them.
  const relatedOf = (docs: Doc[]) =>
    windows.flatMap((window) => {
      const to = link(window)
      return docs.some(({ related }) =>
        related?.some((one) => typeof one === 'object' && one?.id === window.doc.id),
      )
        ? [{ href: to.href, label: to.title, lang: to.lang }]
        : []
    })
  // An item as its parent's lists show it: what its Listing leaves empty comes from its first Header and its first
  // picture.
  const listed = (one: Seen): Listed => {
    const { doc } = one
    const header = doc.sections?.find((block) => block.blockType === 'header')
    const pictures = (doc.sections ?? []).flatMap((block) =>
      block.blockType === 'media' ? block.items.map(({ picture }) => picture) : [],
    )
    const picture = [doc.cover, ...pictures].find(
      (file): file is Media => typeof file === 'object' && !!file?.url,
    )
    const { href, lang } = link(one)
    return {
      href,
      lang,
      name: doc.title,
      caption: doc.caption || null,
      title: doc.headline || header?.title || doc.title,
      note: doc.note || null,
      text: doc.description || header?.text || null,
      picture: picture
        ? {
            src: picture.url!,
            alt: picture.alt,
            position: `${picture.focalX ?? 50}% ${picture.focalY ?? 50}%`,
            live: picture.live ?? null,
          }
        : null,
      facts: (doc.facts ?? []).map(({ label, value }) => ({ label, value })),
      related: relatedOf([doc]),
      icon: doc.icon ?? null,
    }
  }
  const listing: Listing = (window) => {
    const found = byId.get(typeof window === 'object' && window ? (window as Doc).id : NaN)
    if (!found) return null
    const items = itemsOf(found)
    return { items: items.map(listed), related: relatedOf(items.map(({ doc }) => doc)) }
  }
  // To a window under its title when it has no label, to a file, which downloads, or to an address.
  const action = (button: Button): Action | null => {
    const label = button.label ?? ''
    if (button.type === 'media') {
      const file = button.media
      return typeof file === 'object' && file?.url
        ? { href: file.url, label, download: true }
        : null
    }
    if (button.type === 'address') return button.url ? { href: button.url, label } : null
    const to = linkTo(button.window)
    if (!to) return null
    return label ? { href: to.href, label } : { href: to.href, label: to.title, lang: to.lang }
  }
  // A link in running text is the link molecule, and says so with an arrow where it leaves the site; one to a
  // window this viewer may not see is its words alone.
  const anchor: HTMLConverter<LinkNode> = ({ node, nodesToHTML }) => {
    const words = nodesToHTML({ nodes: node.children }).join('')
    const { fields } = node
    const href = fields.linkType === 'internal' ? linkTo(fields.doc?.value)?.href : fields.url
    if (!href) return words
    const away = /^https?:/i.test(href)
      ? `<svg aria-hidden="true" class="icon" data-size="s" viewBox="0 0 24 24">${icons['arrow-up-right']}</svg>`
      : ''
    const target = fields.newTab ? ' rel="noopener noreferrer" target="_blank"' : ''
    return `<a class="link" href="${escape(sanitizeUrl(href))}"${target}>${words}${away}</a>`
  }
  const converters: HTMLConverters = { ...defaultHTMLConverters, link: anchor, autolink: anchor }
  const html = (body: SerializedEditorState) =>
    convertLexicalToHTML({
      converters,
      data: body,
      disableContainer: true,
      disableIndent: true,
      disableTextAlign: true,
    })
  const sectionOf = (block: NonNullable<Doc['sections']>[number], here: string) => {
    switch (block.blockType) {
      case 'header':
        return header(block, action)
      case 'text':
        return text(block, html)
      case 'media':
        return media(block)
      case 'stats':
        return stats(block)
      case 'quote':
        return quote(block)
      case 'facts':
        return facts(block)
      case 'table':
        return table(block)
      case 'cards':
        return cards(block, action, listing)
      case 'list':
        return list(block, {
          to: (window) => linkTo(window)?.href ?? null,
          action,
          here,
          listing,
          words: { empty: t.empty, share: t.share },
        })
    }
  }
  // A joined section continues a section with a heading and a body: a Header, a picture and a quotation share none.
  const sectionsOf = ({ doc, path }: Seen): Section[] =>
    (doc.sections ?? [])
      .map((block) => sectionOf(block, toAddress(language, path)))
      // A Media section with no picture left still stands between two texts, so it is dropped after the join is read.
      .map((section, at, all) =>
        section && 'join' in section && section.join && !continued(all[at - 1])
          ? { ...section, join: false }
          : section,
      )
      .filter((section) => section !== null)

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
      hidden: app.doc.hidden || undefined,
      frame: {
        title: doc.title,
        kind: doc.kind ?? null,
        tile: app.doc.tile ?? null,
        oneSize: app.doc.oneSize ?? undefined,
      },
      sections: sectionsOf(one),
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
