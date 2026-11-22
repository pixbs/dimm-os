'use client'

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'

type Props = {
  value: number
  onChange?: (value: number) => void
  // The id of the visible label that names it.
  labelledBy: string
} & (
  | { min: number; max: number }
  // A ring of steps without an end, each named in words, and the first step of each group of them.
  | { steps: string[]; groups: number[] }
)

// The share of a turn from the top to a point, clockwise; a drag that crosses the top from the share before stays
// at the end it reached, so the value never jumps from one end to the other.
export function turned(x: number, y: number, before: number | null) {
  const turn = (((Math.atan2(x, y) / (2 * Math.PI)) % 1) + 1) % 1
  if (before === null || Math.abs(turn - before) <= 0.5) return turn
  return before > 0.5 ? 1 : 0
}

const wrap = (value: number, count: number) => ((value % count) + count) % count

// The steps from one to the other the short way round a ring, so the hand never turns back across the top.
const around = (from: number, to: number, count: number) =>
  wrap(to - from + Math.floor(count / 2), count) - Math.floor(count / 2)

// A knob, set by a press on its scale, a drag or the keys: from its minimum at the top to its maximum once round, or
// round a ring of steps that has no end.
export function Dial({ onChange, labelledBy, ...props }: Props) {
  const ring = 'steps' in props ? props : null
  const [min, max] = 'steps' in props ? [0, props.steps.length - 1] : [props.min, props.max]
  const count = max - min + 1
  const keep = (next: number) =>
    ring ? wrap(Math.round(next), count) : Math.min(max, Math.max(min, Math.round(next)))
  const [value, setValue] = useState(() => keep(props.value))
  // On a ring, the steps turned in all, so the hand goes on round past the top.
  const [laps, setLaps] = useState(value)
  const move = (next: number) => {
    setLaps((turns) => turns + around(value, next, count))
    setValue(next)
  }
  // A new value from outside, a reset, is taken as it comes, inside the range.
  const [given, setGiven] = useState(props.value)
  if (given !== props.value) {
    setGiven(props.value)
    move(keep(props.value))
  }
  const [turning, setTurning] = useState(false)
  // The share of the turn while the knob is held, or null.
  const held = useRef<number | null>(null)

  const set = (next: number) => {
    const kept = keep(next)
    move(kept)
    onChange?.(kept)
  }
  const at = (event: PointerEvent<HTMLDivElement>, before: number | null) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - (box.left + box.width / 2)
    const y = box.top + box.height / 2 - event.clientY
    held.current = turned(x, y, ring ? null : before)
    set(ring ? held.current * count : min + held.current * (max - min))
  }
  const group = (by: number) => {
    const groups = ring!.groups
    const now = groups.filter((first) => first <= value).length - 1
    return groups[wrap(now + by, groups.length)] - value
  }
  const keys: Record<string, number> = {
    ArrowRight: 1,
    ArrowUp: 1,
    ArrowLeft: -1,
    ArrowDown: -1,
    PageUp: ring ? group(1) : Math.ceil((max - min) / 10),
    PageDown: ring ? group(-1) : -Math.ceil((max - min) / 10),
    Home: min - value,
    End: max - value,
  }

  return (
    <div
      aria-labelledby={labelledBy}
      // A ring counts its steps from one.
      aria-valuemax={ring ? count : max}
      aria-valuemin={ring ? 1 : min}
      aria-valuenow={ring ? value + 1 : value}
      aria-valuetext={ring?.steps[value]}
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
      style={{ '--turn': ring ? laps / count : (value - min) / (max - min) } as CSSProperties}
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
