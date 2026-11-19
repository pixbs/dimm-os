import type { IconName } from '@/ds/atoms/Icon'
import type { Language } from '@/i18n/address'
import type { ListBlock } from '@/payload-types'

import { framed } from '../framed'
import type { Action, Button } from '../header/view'
import type { Listed, Listing, Shown } from '../listing'

// What an item of a window shows as its row opens: its picture, its line, its facts, and the way to it.
type Preview = {
  picture: Shown | null
  text: string | null
  facts: Listed['facts']
  action: Action
}

type Item = {
  // An item of a window: the address that names it, its language where it is not the page's, the windows it relates
  // to, by their addresses, and its preview.
  key: string | null
  lang?: Language
  tags: string[]
  name: string | null
  caption: string | null
  title: string
  text: string[]
  end: string | null
  // A share as dots, with the words that read it.
  meter: { on: number; of: number; label: string } | null
  icon: IconName | null
  picture: { src: string; position: string } | null
  href: string | null
  // It leads to the window the list is in.
  current: boolean
  preview: Preview | null
  // What an item of a window is typed as.
  kind: string | null
}

export type ListView = ReturnType<typeof framed> & {
  type: 'list'
  surface: NonNullable<ListBlock['surface']>
  large: boolean
  lead: ListBlock['lead']
  opens: boolean
  // A headed list names its rows and their end in a head of its own.
  head: { title: string | null; end: string } | null
  items: Item[]
  // A list of the items of a window can be filtered by what they relate to, each choice with its count, and holds
  // its rows to a limit.
  filter: (Action & { count: number })[] | null
  limit: number | null
  foot: Action | null
  // The one line an empty list shows.
  empty: string | null
}

type Ways = {
  // Where a window leads for this viewer, or null where it may not see it.
  to: (window: unknown) => string | null
  action: (button: Button) => Action | null
  here: string
  listing: Listing
  words: { empty: string; share: string }
}

// A row about an item of a window: its title as the name, what its Listing says, and the windows it relates to.
const listed =
  (block: ListBlock, here: string) =>
  (one: Listed): Item => ({
    key: one.href,
    lang: one.lang,
    tags: one.related.map((window) => window.href),
    name: one.name,
    caption: one.caption,
    title: one.title,
    text: [one.note, one.related.map((window) => window.label).join(', ')].filter(
      (line): line is string => !!line,
    ),
    end: null,
    meter: null,
    icon: block.lead === 'icon' ? one.icon : null,
    picture: block.lead === 'picture' ? one.picture : null,
    href: block.rows === 'link' ? one.href : null,
    current: block.rows === 'link' && one.href === here,
    preview:
      block.rows === 'opens'
        ? {
            picture: one.picture,
            text: one.text,
            facts: one.facts,
            action: { href: one.href, label: one.name, lang: one.lang },
          }
        : null,
    kind: one.kind,
  })

// A list of the items of a window this viewer may not see is absent.
export function list(block: ListBlock, ways: Ways): ListView | null {
  const { to, action, here, listing, words } = ways
  const frame = framed(block)
  const links = block.rows === 'link'
  const of = block.source === 'window' ? listing(block.from) : null
  if (block.source === 'window' && !of) return null
  const own = (block.source === 'window' ? [] : (block.items ?? [])).flatMap((item): Item[] => {
    const { picture } = item
    const href = links ? (item.window ? to(item.window) : item.url || null) : null
    // A row of a link list always leads somewhere, so one left with nowhere, as its window is hidden from this viewer, is
    // absent for them, as in every list, and leaves no gap in a count.
    if (links && !href) return []
    return [
      {
        key: null,
        tags: [],
        name: item.name || null,
        caption: (item.name && item.caption) || null,
        title: item.title,
        text: (item.text ?? '').split('\n').filter((line) => line.trim()),
        end: item.end || null,
        meter:
          item.of && item.share != null
            ? {
                on: item.share,
                of: item.of,
                label: words.share
                  .replace('{on}', String(item.share))
                  .replace('{of}', String(item.of)),
              }
            : null,
        icon: block.lead === 'icon' ? (item.icon ?? null) : null,
        picture:
          block.lead === 'picture' && typeof picture === 'object' && picture?.url
            ? { src: picture.url, position: `${picture.focalX ?? 50}% ${picture.focalY ?? 50}%` }
            : null,
        href,
        current: href === here,
        preview: null,
        kind: null,
      },
    ]
  })
  const items = of ? of.items.map(listed(block, here)) : own
  // A limit leads on to the window listed, unless the foot leads elsewhere.
  const onward = of && block.limit && items.length > block.limit
  const foot =
    block.foot?.[0] ?? (onward ? ({ type: 'window', window: block.from } as Button) : null)
  // A headed list holds its title in its head, or over the line that says it has no rows yet, and never beside them.
  const head = block.endLabel && items.length ? { title: frame.title, end: block.endLabel } : null
  return {
    type: 'list',
    ...frame,
    ...(block.endLabel && { text: null, split: false }),
    ...(head && { title: null }),
    surface: block.surface ?? 'window',
    large: Boolean(block.large),
    lead: block.lead,
    opens: block.rows === 'opens',
    head,
    items,
    filter:
      of && block.filter && of.related.length
        ? of.related.map((window) => ({
            ...window,
            count: items.filter(({ tags }) => tags.includes(window.href)).length,
          }))
        : null,
    limit: (of && block.limit) || null,
    foot: foot && action(foot),
    empty: items.length ? null : words.empty,
  }
}
