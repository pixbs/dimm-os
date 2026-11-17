import type { ComponentProps, ReactNode } from 'react'

import { Cards as Grid } from '../organisms/Card'
import { Section, type Surface } from './Section'

// Cards in a grid under their heading or beside it; what continues it, joined, stands after them.
export function Cards(
  props: ComponentProps<typeof Grid> & {
    title?: string | null
    text?: string | null
    split?: boolean
    surface?: Surface
    children?: ReactNode
  },
) {
  return (
    <Section split={props.split} surface={props.surface} text={props.text} title={props.title}>
      <Grid columns={props.columns} items={props.items} />
      {props.children}
    </Section>
  )
}
