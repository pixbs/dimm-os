'use client'

import { type ReactNode, useState } from 'react'

import { Bar, BarText } from '../molecules/Bar'
import { Decipher } from '../motion/Decipher'
import { usePainted } from '../motion/vocabulary'

// A record opens with its stamp line: the barcode, its code and a note at its end, which decipher as they appear.
export function Stamp({ code, note }: { code: string; note?: string }) {
  return (
    <p className="record__stamp">
      <span className="record__code">
        <span aria-hidden className="barcode" />
        <Decipher>{code}</Decipher>
      </span>
      {note && <Decipher>{note}</Decipher>}
    </p>
  )
}

// The head of a record: its stamp line, its title and the heavy rule. A record that arrives prints: the stamp lands and
// the rule draws from its start, while what the server painted is simply there.
export function RecordHead(props: {
  stamp?: { code: string; note?: string }
  children: ReactNode
}) {
  const painted = usePainted()
  const [prints] = useState(!painted)

  return (
    <div className="record__head" data-print={prints ? '' : undefined}>
      {props.stamp && <Stamp {...props.stamp} />}
      {props.children}
      <div aria-hidden className="record__rule" />
    </div>
  )
}

// The line that closes a record: what it says at its start and at its end.
export function RecordFoot({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <p className="record__foot">
      <span>{start}</span>
      {end}
    </p>
  )
}

// A record as a card beside the content of a window: a bar with its name, its head, what it keeps, and its foot or its
// actions. It stays where the page puts it.
export function RecordCard(props: {
  name: string
  label: string
  head: ReactNode
  children: ReactNode
  foot?: ReactNode
}) {
  return (
    <section aria-label={props.label} className="record" data-surface="paper">
      <Bar line="below" size="compact">
        <BarText>{props.name}</BarText>
      </Bar>
      {props.head}
      {props.children}
      {props.foot}
    </section>
  )
}
