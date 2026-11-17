import type { IconName } from '@/ds/atoms/Icon'
import type { ListBlock } from '@/payload-types'

import { framed } from '../framed'
import type { Action, Button } from '../header/view'

type Item = {
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
  foot: Action | null
  // The one line an empty list shows.
  empty: string | null
}

type Ways = {
  // Where a window leads for this viewer, or null where it may not see it.
  to: (window: unknown) => string | null
  action: (button: Button) => Action | null
  here: string
  words: { empty: string; share: string }
}

export function list(block: ListBlock, { to, action, here, words }: Ways): ListView {
  const frame = framed(block)
  const links = block.rows === 'link'
  const items = (block.items ?? []).flatMap((item): Item[] => {
    const { picture } = item
    const href = links ? (item.window ? to(item.window) : item.url || null) : null
    // A row of a link list always leads somewhere, so one left with nowhere, as its window is hidden from this viewer, is
    // absent for them, as in every list, and leaves no gap in a count.
    if (links && !href) return []
    return [
      {
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
      },
    ]
  })
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
    foot: block.foot?.[0] ? action(block.foot[0]) : null,
    empty: items.length ? null : words.empty,
  }
}
