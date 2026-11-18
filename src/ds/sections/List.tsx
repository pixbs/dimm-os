import type { ComponentProps, ReactNode } from 'react'

import { Items } from '../organisms/List'
import { Section, type Surface } from './Section'

// Rows under a heading: steps, navigation, the groups of a record; a headed list holds its title in its head. On paper
// every titled list is headed, and one with no title is ruled.
export function List(
  props: ComponentProps<typeof Items> & {
    title?: string | null
    text?: string | null
    split?: boolean
    surface?: Surface
    paper?: boolean
    children?: ReactNode
  },
) {
  const { paper, title } = props
  const head = props.head ?? (paper && title ? { title, end: '' } : null)
  return (
    <Section
      split={props.split}
      surface={props.surface}
      text={paper ? null : props.text}
      title={paper ? null : title}
    >
      <Items {...props} head={head} ruled={paper && !head} />
      {props.children}
    </Section>
  )
}
