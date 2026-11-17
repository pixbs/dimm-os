import type { ComponentProps } from 'react'

import { Quote as Quotation } from '../organisms/Quote'
import { Section, type Surface } from './Section'

// One quotation and who said it, with no heading, on a surface of its own.
export function Quote(props: ComponentProps<typeof Quotation> & { surface?: Surface }) {
  const { surface, ...quotation } = props

  return (
    <Section surface={surface}>
      <Quotation {...quotation} />
    </Section>
  )
}
