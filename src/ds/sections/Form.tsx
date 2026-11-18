import type { ComponentProps } from 'react'

import { Form as Fields } from '../organisms/Form'
import { Section, type Surface } from './Section'

// Any form of the form builder under a heading, beside it in a wide window, on a surface of its own.
export function Form(
  props: ComponentProps<typeof Fields> & {
    title: string | null
    text: string | null
    split: boolean
    surface?: Surface
  },
) {
  const { title, text, split, surface, ...form } = props

  return (
    <Section split={split} surface={surface} text={text} title={title}>
      <Fields {...form} />
    </Section>
  )
}
