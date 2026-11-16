'use client'

import type { MotionValue } from 'motion/react'
import { type KeyboardEvent, type PointerEvent, type RefObject, useRef } from 'react'

import { curve, duration, reduced, spring } from '../motion/vocabulary'
import { follow } from './follow'

// A press that moves less than a step is a press; let go faster than this, in px a second, a drawer is flicked.
const STEP = 8
const FLICK = 500
// How far back the speed of a drag is read, in ms.
const RECENT = 100

// What a drawer does: it rises from the bottom edge, not from its opener, and sinks back to it on the spring,
// from where the finger left it and as fast; with reduced motion it fades in place.
// The drawer and how fast it was let go reach its moves as their custom value.
export type Held = { drawer: RefObject<HTMLElement | null>; flung: RefObject<number> }

export function rises() {
  // Before it is in the page its height is its own, and Motion reads a share of it.
  const sinks = ({ drawer, flung }: Held) =>
    reduced()
      ? { opacity: 0, transition: { duration: duration('slow-exit'), ease: curve('exit') } }
      : {
          y: drawer.current?.offsetHeight ?? '100%',
          opacity: 1,
          scale: 1,
          transition: { ...spring('slow'), velocity: flung.current },
        }
  const open = () => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: reduced()
      ? { duration: duration('slow'), ease: curve('enter'), y: { duration: 0 } }
      : spring('slow'),
  })
  // Let go before it is put away, it springs back from where the finger left it: written as keyframes, the target
  // differs from the last one, so Motion moves it again.
  const kept = () => ({ ...open(), y: [null, 0] })
  return { closed: sinks, away: sinks, open, kept }
}

// The way out of a drawer, and it has no other: pressed, dragged down past half the drawer or flicked, it puts the
// drawer away, and let go sooner the drawer springs back. The drawer follows the finger, never above its place.
export function Handle(props: {
  label: string
  y: MotionValue<number>
  height: () => number
  leave: (speed: number) => void
  stay: () => void
}) {
  const { y } = props
  const moved = useRef(false)

  function grab(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    moved.current = false
    const seen: [number, number][] = []
    follow(event, {
      move: (_, dy) => {
        moved.current ||= Math.abs(dy) >= STEP
        if (!moved.current) return
        seen.push([performance.now(), dy])
        y.stop()
        y.set(Math.max(0, dy))
      },
      end: (_, dy) => {
        if (!moved.current) return
        const now = performance.now()
        const from = seen.find(([at]) => now - at <= RECENT)
        const speed = from && now > from[0] ? ((dy - from[1]) / (now - from[0])) * 1000 : 0
        if (speed >= FLICK || dy >= props.height() / 2) props.leave(Math.max(0, speed))
        else props.stay()
      },
    })
  }

  return (
    <button
      aria-label={props.label}
      className="drawer__handle"
      // A drag ends in its own way; a press, or Enter and Space, puts the drawer away.
      onClick={() => (moved.current ? (moved.current = false) : props.leave(0))}
      onPointerDown={grab}
      type="button"
    />
  )
}

const focusable = 'a[href], button, input, select, textarea, [tabindex]'

// A drawer is modal: Tab and Shift Tab go round what it holds and never leave it.
export function trap(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return
  const at = document.activeElement!
  const all = [...event.currentTarget.querySelectorAll<HTMLElement>(focusable)].filter(
    (one) => one.tabIndex >= 0 && !one.matches(':disabled') && one.checkVisibility(),
  )
  const ahead = all.some((one) =>
    event.shiftKey
      ? one.compareDocumentPosition(at) & Node.DOCUMENT_POSITION_FOLLOWING
      : at.compareDocumentPosition(one) & Node.DOCUMENT_POSITION_FOLLOWING,
  )
  if (ahead) return
  event.preventDefault()
  ;(event.shiftKey ? all.at(-1) : all[0])?.focus()
}
