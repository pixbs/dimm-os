import type { ReactNode } from 'react'

import { Table as Rows } from '../organisms/Table'
import { Section, type Surface } from './Section'

// Rows with columns under their heading, never beside it, since a table takes the whole width it has.
export function Table(props: {
  title?: string | null
  text?: string | null
  surface?: Surface
  columns: string[]
  rows: string[][]
  children?: ReactNode
}) {
  return (
    <Section surface={props.surface} text={props.text} title={props.title}>
      <Rows columns={props.columns} rows={props.rows} />
      {props.children}
    </Section>
  )
}
