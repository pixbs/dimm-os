'use client'

import { type ReactNode, useState } from 'react'

import { Row } from '../molecules/Row'
import { Origin } from '../motion/Origin'

type Item = {
  key: string
  title: string
  text?: string
  // A control of the item, on the end of its row, pressed on its own.
  end?: ReactNode
  pane: ReactNode
}

// A list at the side and, beside it, what the item in use holds: pressing a row puts its item in the pane and holds the
// row pressed. A compact window has no side: there the item opens in place, under its row.
export function SplitView(props: { items: Item[]; label: string; ruled?: boolean }) {
  const { items } = props
  const [open, setOpen] = useState<string | null>(items[0]?.key ?? null)
  const shown = items.find((item) => item.key === open) ?? items[0]

  return (
    <div className="splitview">
      <div
        aria-label={props.label}
        className="list splitview__list"
        data-ruled={props.ruled ? '' : undefined}
        role="group"
      >
        {items.map((item) => {
          const opened = item.key === open
          return (
            <div className="list__item" data-open={opened ? '' : undefined} key={item.key}>
              <div className="list__row">
                <Row
                  aria-expanded={opened}
                  icon={opened ? 'minus' : 'plus'}
                  onClick={() => setOpen(opened ? null : item.key)}
                  text={item.text}
                  title={item.title}
                  trail={item.end && <span className="list__space" />}
                />
                {item.end && <span className="list__end">{item.end}</span>}
              </div>
              <Origin className="splitview__panel" open={opened} speed="fast">
                {item.pane}
              </Origin>
            </div>
          )
        })}
      </div>
      {shown && (
        <div className="splitview__pane" key={shown.key}>
          {shown.pane}
        </div>
      )}
    </div>
  )
}
