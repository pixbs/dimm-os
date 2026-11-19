import type { MediaBlock } from '@/payload-types'

import type { Show, Shown } from '../listing'

export type Picture = Shown & { caption: string | null }

export type MediaView = {
  type: 'media'
  title: string | null
  text: string | null
  columns: 1 | 2 | 3
  ratio: MediaBlock['ratio']
  bleed: boolean
  items: Picture[]
}

// A picture this viewer may not read, or one without a file, is absent; one picture is one column.
export function media(block: MediaBlock, show: Show): MediaView | null {
  const items = block.items.flatMap(({ picture, caption }): Picture[] => {
    const shown = show(picture)
    return shown ? [{ ...shown, caption: caption || null }] : []
  })
  if (!items.length) return null
  return {
    type: 'media',
    title: block.title || null,
    text: (block.title && block.text) || null,
    columns: items.length > 1 ? (Number(block.columns ?? 1) as 1 | 2 | 3) : 1,
    ratio: block.ratio,
    bleed: Boolean(block.bleed),
    items,
  }
}
