import type { QuoteBlock } from '@/payload-types'

export type QuoteView = {
  type: 'quote'
  surface: QuoteBlock['surface']
  text: string
  name: string
  role: string | null
  // A picture this viewer may not read, or one without a file, leaves the avatar empty.
  avatar: { src: string; alt: string; position: string } | null
}

export function quote(block: QuoteBlock): QuoteView {
  const { avatar } = block
  return {
    type: 'quote',
    surface: block.surface,
    text: block.text,
    name: block.name,
    role: block.role || null,
    avatar:
      typeof avatar === 'object' && avatar?.url
        ? {
            src: avatar.url,
            alt: avatar.alt,
            position: `${avatar.focalX ?? 50}% ${avatar.focalY ?? 50}%`,
          }
        : null,
  }
}
