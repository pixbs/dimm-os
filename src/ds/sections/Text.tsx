import type { ReactNode } from 'react'

import { Prose } from '../organisms/Prose'
import { Section } from './Section'

// Running text under its heading; what continues it, joined, stands in its body after it.
export function Text(props: {
  title?: string | null
  text?: string | null
  split?: boolean
  html: string
  eyebrow?: string
  id?: string
  children?: ReactNode
}) {
  return (
    <Section
      eyebrow={props.eyebrow}
      id={props.id}
      split={props.split}
      text={props.text}
      title={props.title}
    >
      <Prose html={props.html} />
      {props.children}
    </Section>
  )
}
