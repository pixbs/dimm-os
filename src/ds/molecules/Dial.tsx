'use client'

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'

type Props = {
  min: number
  max: number
  value: number
  onChange?: (value: number) => void
  // The id of the visible label that names it.
  labelledBy: string
}

// The share of a turn from the top to a point, clockwise; a drag that crosses the top from the share before stays
// at the end it reached, so the value never jumps from one end to the other.
export function turned(x: number, y: number, before: number | null) {
  const turn = (((Math.atan2(x, y) / (2 * Math.PI)) % 1) + 1) % 1
  if (before === null || Math.abs(turn - before) <= 0.5) return turn
  return before > 0.5 ? 1 : 0
}

// A knob from its minimum at the top to its maximum once round, set by a press on its scale, a drag or the keys.
export function Dial({ min, max, onChange, ...props }: Props) {
  const keep = (next: number) => Math.min(max, Math.max(min, Math.round(next)))
  const [value, setValue] = useState(() => keep(props.value))
  // A new value from outside, a reset, is taken as it comes, inside the range.
  const [given, setGiven] = useState(props.value)
  if (given !== props.value) {
    setGiven(props.value)
    setValue(keep(props.value))
  }
  const [turning, setTurning] = useState(false)
  // The share of the turn while the knob is held, or null.
  const held = useRef<number | null>(null)

  const set = (next: number) => {
    const kept = keep(next)
    setValue(kept)
    onChange?.(kept)
  }
  const at = (event: PointerEvent<HTMLDivElement>, before: number | null) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - (box.left + box.width / 2)
    const y = box.top + box.height / 2 - event.clientY
    held.current = turned(x, y, before)
    set(min + held.current * (max - min))
  }
  const keys: Record<string, number> = {
    ArrowRight: 1,
    ArrowUp: 1,
    ArrowLeft: -1,
    ArrowDown: -1,
    PageUp: Math.ceil((max - min) / 10),
    PageDown: -Math.ceil((max - min) / 10),
    Home: min - value,
    End: max - value,
  }

  return (
    <div
      aria-labelledby={props.labelledBy}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={value}
      className="dial"
      data-turning={turning ? '' : undefined}
      onKeyDown={(event: KeyboardEvent) => {
        if (!(event.key in keys)) return
        event.preventDefault()
        set(value + keys[event.key])
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        at(event, null)
      }}
      onPointerMove={(event) => {
        if (held.current === null) return
        setTurning(true)
        at(event, held.current)
      }}
      onPointerUp={() => {
        held.current = null
        setTurning(false)
      }}
      onPointerCancel={() => {
        held.current = null
        setTurning(false)
      }}
      role="slider"
      style={{ '--turn': (value - min) / (max - min) } as CSSProperties}
      tabIndex={0}
    >
      <svg aria-hidden="true" className="dial__scale" viewBox="0 0 120 120">
        <circle className="dotring" cx="60" cy="60" r="56" />
      </svg>
      <span className="dial__knob" data-surface="raised">
        <span className="dial__hand">
          <span className="dot" data-tone="signal" />
        </span>
      </span>
    </div>
  )
}
