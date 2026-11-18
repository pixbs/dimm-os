'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'

import type { IconName } from '../atoms/Icon'
import { Heading } from '../molecules/Heading'
import { Row } from '../molecules/Row'
import { List } from './List'

const corners = ['tl', 'tr', 'bl', 'br'] as const
type Corner = (typeof corners)[number]

type PlateProps = {
  label: string
  // What each screw does when pressed, from the top left to the bottom right.
  screws: string[]
  stamp: { code: string; note?: string }
  title: string
  text?: string
  facts: { label: string; value: ReactNode }[]
  marks: { icon: IconName; title: string; text: string }[]
  foot: string[]
  // What the bay holds, given the way to put the plate back.
  inside: (close: () => void) => ReactNode
}

// A record screwed onto what it describes, in a bay: each screw comes out when pressed, with one left the plate swings
// until its middle is straight under it, and with none it falls and the bay shows what it holds until it is put back.
export function Plate(props: PlateProps) {
  const [out, setOut] = useState<Corner[]>([])
  const [hang, setHang] = useState(0)
  const plate = useRef<HTMLDivElement>(null)
  const inside = useRef<HTMLDivElement>(null)
  // The focus follows only what the visitor did: into the bay when it falls, to a screw when it is back.
  const [moves, setMoves] = useState(0)
  const fallen = out.length === corners.length
  const half = Math.ceil(props.facts.length / 2)
  const by = out.length >= 3 ? corners.find((corner) => !out.slice(0, 3).includes(corner)) : null

  useEffect(() => {
    if (!moves) return
    if (fallen) inside.current?.focus()
    else plate.current?.querySelector<HTMLElement>('.screw')?.focus()
  }, [moves, fallen])

  const take = (corner: Corner) => {
    const left = corners.filter((one) => one !== corner && !out.includes(one))
    // The angle that brings the plate's middle under the last screw, from the size it has now.
    if (left.length === 1) {
      const whole = plate.current!
      const screw = whole.querySelector<HTMLElement>(`[data-corner='${left[0]}']`)!
      const across = whole.offsetWidth / 2 - (screw.offsetLeft + screw.offsetWidth / 2)
      const down = whole.offsetHeight / 2 - (screw.offsetTop + screw.offsetHeight / 2)
      setHang((Math.atan2(across, down) * 180) / Math.PI)
    }
    if (!left.length) setMoves((count) => count + 1)
    setOut([...out, corner])
    // A screw that is out cannot be pressed again, so the focus goes on to one that is still in.
    plate.current!.querySelector<HTMLElement>(`[data-corner='${left[0]}']`)?.focus()
  }
  const close = () => {
    setMoves((count) => count + 1)
    setOut([])
  }

  return (
    <div className="bay">
      <div
        aria-label={props.label}
        className="plate"
        data-by={by ?? undefined}
        data-state={fallen ? 'fallen' : by ? 'hanging' : undefined}
        data-surface="paper"
        inert={fallen}
        ref={plate}
        role="group"
        style={{ '--hang': `${hang}deg` } as CSSProperties}
      >
        <div className="plate__head">
          <p className="plate__stamp">
            <span className="plate__code">
              <span aria-hidden className="barcode" />
              {props.stamp.code}
            </span>
            {props.stamp.note && <span>{props.stamp.note}</span>}
          </p>
          <Heading level="hero" page text={props.text} title={props.title} />
          <hr className="plate__rule" />
        </div>
        <div className="grid" data-columns="2">
          {[props.facts.slice(0, half), props.facts.slice(half)].map((facts, column) => (
            <List key={column} ruled>
              {facts.map(({ label, value }, at) => (
                <Row key={at} label={label} value={value} />
              ))}
            </List>
          ))}
        </div>
        <div className="plate__marks">
          {props.marks.map((mark) => (
            <Row icon={mark.icon} key={mark.title} text={mark.text} title={mark.title} />
          ))}
        </div>
        <p className="plate__foot">
          {props.foot.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </p>
        {/* After what the plate says, so Tab reaches the screws from its title. */}
        {corners.map((corner, at) => (
          <button
            aria-label={props.screws[at]}
            className="screw"
            data-corner={corner}
            data-out={out.includes(corner) ? '' : undefined}
            disabled={out.includes(corner)}
            key={corner}
            onClick={() => take(corner)}
            type="button"
          />
        ))}
      </div>
      {/* After the plate, so the window takes the focus at the plate's title; it lies under the plate all the same. */}
      <div className="bay__inside" inert={!fallen} ref={inside} tabIndex={-1}>
        {props.inside(close)}
      </div>
    </div>
  )
}
