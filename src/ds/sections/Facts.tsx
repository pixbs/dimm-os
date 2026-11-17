import type { ReactNode } from 'react'

import { Row } from '../molecules/Row'
import { List } from '../organisms/List'
import { Section, type Surface } from './Section'

// Pairs of label and value, the label a third of the row; what continues it, joined, stands after them.
export function Facts(props: {
  title?: string | null
  text?: string | null
  split?: boolean
  surface?: Surface
  items: { label: string; value: string }[]
  children?: ReactNode
}) {
  return (
    <Section split={props.split} surface={props.surface} text={props.text} title={props.title}>
      <List>
        {props.items.map(({ label, value }, at) => (
          <Row key={at} label={label} value={value} />
        ))}
      </List>
      {props.children}
    </Section>
  )
}
