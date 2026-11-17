import type { ComponentProps, ReactNode } from 'react'

import { Items } from '../organisms/List'
import { Section, type Surface } from './Section'

// Rows under a heading: steps, navigation, the groups of a record; a headed list holds its title in its head.
export function List(
  props: ComponentProps<typeof Items> & {
    title?: string | null
    text?: string | null
    split?: boolean
    surface?: Surface
    children?: ReactNode
  },
) {
  return (
    <Section split={props.split} surface={props.surface} text={props.text} title={props.title}>
      <Items {...props} />
      {props.children}
    </Section>
  )
}
