import type { ComponentProps } from 'react'

import { Gallery } from '../organisms/Gallery'
import { Section } from './Section'

// One picture, or a gallery of them, inset or edge to edge, under an optional heading.
export function Media(
  props: ComponentProps<typeof Gallery> & {
    title?: string | null
    text?: string | null
    bleed?: boolean
  },
) {
  const { title, text, bleed, ...gallery } = props

  return (
    <Section bleed={bleed} text={text} title={title}>
      <Gallery {...gallery} />
    </Section>
  )
}
