import type { Media, MediaBlock } from '@/payload-types'

export type Picture = {
  src: string
  alt: string
  caption: string | null
  // Where the box crops it: the focal point, as an object position.
  position: string
  // A live picture: its upload is the still that stands until the system draws over it.
  live: NonNullable<Media['live']> | null
}

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
export function media(block: MediaBlock): MediaView | null {
  const items = block.items.flatMap(({ picture, caption }): Picture[] =>
    typeof picture === 'object' && picture?.url
      ? [
          {
            src: picture.url,
            alt: picture.alt,
            caption: caption || null,
            position: `${picture.focalX ?? 50}% ${picture.focalY ?? 50}%`,
            live: picture.live ?? null,
          },
        ]
      : [],
  )
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
