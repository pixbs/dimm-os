import type { CardsBlock, Media } from '@/payload-types'

import { framed } from '../framed'
import type { Action, Button } from '../header/view'

type Card = {
  title: string
  text: string | null
  surface: NonNullable<CardsBlock['items'][number]['surface']>
  picture: {
    src: string
    alt: string
    position: string
    live: NonNullable<Media['live']> | null
  } | null
  actions: Action[]
}

export type CardsView = ReturnType<typeof framed> & {
  type: 'cards'
  surface: NonNullable<CardsBlock['surface']>
  tiles: boolean
  columns: 1 | 2 | 3
  items: Card[]
}

// A picture this viewer may not read is absent, and so is a card that leads to a window they may not see, which it is
// about; with no card left the section is absent too.
export function cards(
  block: CardsBlock,
  action: (button: Button) => Action | null,
): CardsView | null {
  const items = (block.items ?? []).flatMap((item) => {
    const ways = (item.actions ?? []).map((button) => ({ button, to: action(button) }))
    if (ways.some(({ button, to }) => button.type === 'window' && !to)) return []
    return [{ ...item, actions: ways.flatMap(({ to }) => to ?? []) }]
  })
  if (!items.length) return null
  const tiles = Boolean(block.tiles)
  return {
    type: 'cards',
    // Tiles stand alone in a window, with no frame.
    ...(tiles ? { title: null, text: null, split: false, join: false } : framed(block)),
    surface: (!tiles && block.surface) || 'window',
    tiles,
    columns: Number(block.columns) as 1 | 2 | 3,
    items: items.map(({ title, text, surface, picture, actions }) => ({
      title,
      text: text || null,
      surface: surface ?? 'raised',
      picture:
        typeof picture === 'object' && picture?.url
          ? {
              src: picture.url,
              alt: picture.alt,
              position: `${picture.focalX ?? 50}% ${picture.focalY ?? 50}%`,
              live: picture.live ?? null,
            }
          : null,
      actions,
    })),
  }
}
