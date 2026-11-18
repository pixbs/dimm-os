import type { ReactNode } from 'react'

import { Row } from '../molecules/Row'
import { List } from '../organisms/List'
import { Section, type Surface } from './Section'

// Pairs of label and value, the label a third of the row; what continues it, joined, stands after them. On paper they
// are a record's: a group under its title in a head of its own, or ruled where it has none.
export function Facts(props: {
  title?: string | null
  text?: string | null
  split?: boolean
  surface?: Surface
  items: { label: string; value: string }[]
  paper?: boolean
  children?: ReactNode
}) {
  const { paper, title } = props
  return (
    <Section
      split={props.split}
      surface={props.surface}
      text={paper ? null : props.text}
      title={paper ? null : title}
    >
      <List head={paper && title ? { title, end: '' } : null} ruled={paper && !title}>
        {props.items.map(({ label, value }, at) => (
          <Row key={at} label={label} value={value} />
        ))}
      </List>
      {props.children}
    </Section>
  )
}
