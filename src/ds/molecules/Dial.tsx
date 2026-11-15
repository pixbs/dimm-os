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

// A knob from its minimum at the top to its maximum once round, set by a press on its scale, a drag or the keys.
export function Dial({ min, max, onChange, ...props }: Props) {
  const [value, setValue] = useState(props.value)
  const [turning, setTurning] = useState(false)
  const held = useRef(false)

  const set = (next: number) => {
    const kept = Math.min(max, Math.max(min, Math.round(next)))
    setValue(kept)
    onChange?.(kept)
  }
  const at = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - (box.left + box.width / 2)
    const y = box.top + box.height / 2 - event.clientY
    const turn = (((Math.atan2(x, y) / (2 * Math.PI)) % 1) + 1) % 1
    set(min + turn * (max - min))
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
        held.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        at(event)
      }}
      onPointerMove={(event) => {
        if (!held.current) return
        setTurning(true)
        at(event)
      }}
      onPointerUp={() => {
        held.current = false
        setTurning(false)
      }}
      onPointerCancel={() => {
        held.current = false
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
