import type { Language } from '@/i18n/address'
import type { CardsBlock } from '@/payload-types'

import { framed } from '../framed'
import type { Action, Button } from '../header/view'
import type { Listing, Show, Shown } from '../listing'

type Card = {
  title: string
  text: string | null
  surface: NonNullable<NonNullable<CardsBlock['items']>[number]['surface']>
  picture: Shown | null
  actions: Action[]
  // A card about an item of a window is a link to it, in the language the item is written in.
  href: string | null
  lang?: Language
}

export type CardsView = ReturnType<typeof framed> & {
  type: 'cards'
  surface: NonNullable<CardsBlock['surface']>
  tiles: boolean
  columns: 1 | 2 | 3
  items: Card[]
}

// A picture this viewer may not read is absent, and so is a card that leads to a window they may not see, which it is
// about; with no card left the section is absent too, as are the cards of a window they may not see.
export function cards(
  block: CardsBlock,
  action: (button: Button) => Action | null,
  listing: Listing,
  show: Show,
): CardsView | null {
  const of = block.source === 'window' ? listing(block.from) : null
  const written = (block.source === 'window' ? [] : (block.items ?? [])).flatMap((item) => {
    const ways = (item.actions ?? []).map((button) => ({ button, to: action(button) }))
    if (ways.some(({ button, to }) => button.type === 'window' && !to)) return []
    const { title, text, surface, picture } = item
    return [
      {
        title,
        text: text || null,
        surface: surface ?? 'raised',
        picture: show(picture),
        actions: ways.flatMap(({ to }) => to ?? []),
        href: null,
      },
    ]
  })
  const items: Card[] = of
    ? of.items.map(({ title, text, picture, href, lang }) => ({
        title,
        text,
        surface: 'raised',
        picture,
        actions: [],
        href,
        lang,
      }))
    : written
  if (!items.length) return null
  const tiles = Boolean(block.tiles)
  return {
    type: 'cards',
    // Tiles stand alone in a window, with no frame.
    ...(tiles ? { title: null, text: null, split: false, join: false } : framed(block)),
    surface: (!tiles && block.surface) || 'window',
    tiles,
    columns: Number(block.columns) as 1 | 2 | 3,
    items,
  }
}
