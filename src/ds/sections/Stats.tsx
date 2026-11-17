import type { ReactNode } from 'react'

import { Stats as Figures } from '../organisms/Stats'
import { Section, type Surface } from './Section'

// Figures and what they count, under their heading or beside it; what continues it, joined, stands after them.
export function Stats(props: {
  title?: string | null
  text?: string | null
  split?: boolean
  surface?: Surface
  items: { value: string; label: string }[]
  children?: ReactNode
}) {
  return (
    <Section split={props.split} surface={props.surface} text={props.text} title={props.title}>
      <Figures items={props.items} />
      {props.children}
    </Section>
  )
}
