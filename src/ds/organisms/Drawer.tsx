'use client'

import type { MotionValue } from 'motion/react'
import { type KeyboardEvent, type PointerEvent, useRef } from 'react'

import { curve, duration, reduced } from '../motion/vocabulary'
import { follow } from './follow'

// A press that moves less than a step is a press; let go faster than this, in px a second, a drawer is flicked.
const STEP = 8
const FLICK = 500
// How far back the speed of a drag is read, in ms.
const RECENT = 100

// A drawer is moved in shares of its own height, so it rises from the bottom edge before it is measured, and keeps
// its place while its content arrives.
const share = (part: number) => `${part * 100}%`

// With reduced motion a drawer, and its scrim, fade in place.
const fade = () => ({ duration: duration('fast'), ease: 'linear' as const })

// What a drawer does: it rises from the bottom edge, not from its opener, over slow on the enter curve, and leaves
// the way it came, from where the finger left it, over slide-exit on the exit curve.
export function rises() {
  const sinks = () =>
    reduced()
      ? { opacity: 0, transition: fade() }
      : {
          y: share(1),
          opacity: 1,
          scale: 1,
          transition: { duration: duration('slide-exit'), ease: curve('exit') },
        }
  const open = () => ({
    y: share(0),
    opacity: 1,
    scale: 1,
    transition: reduced()
      ? { ...fade(), y: { duration: 0 } }
      : { duration: duration('slow'), ease: curve('enter') },
  })
  // Let go before it is put away, it springs back from where the finger left it: written as keyframes, the target
  // differs from the last one, so Motion moves it again.
  const kept = () => ({ ...open(), y: [null, share(0)] })
  return { closed: sinks, away: sinks, open, kept }
}

// The scrim behind a drawer fades with it, both ways.
export function dims() {
  const to = (opacity: number, time: 'slow' | 'slide-exit') => () => ({
    opacity,
    transition: reduced() ? fade() : { duration: duration(time), ease: 'linear' as const },
  })
  const shown = to(1, 'slow')
  const gone = to(0, 'slide-exit')
  return { open: shown, kept: shown, closed: gone, away: gone }
}

// The way out of a drawer, and it has no other: pressed, dragged down past half the drawer or flicked, it puts the
// drawer away, and let go sooner the drawer springs back. The drawer follows the finger, never above its place.
export function Handle(props: {
  label: string
  y: MotionValue<string>
  height: () => number
  leave: () => void
  stay: () => void
}) {
  const { y } = props
  const moved = useRef(false)

  function grab(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    moved.current = false
    const height = props.height()
    const seen: [number, number][] = []
    follow(event, {
      move: (_, dy) => {
        moved.current ||= Math.abs(dy) >= STEP
        if (!moved.current) return
        seen.push([performance.now(), dy])
        y.stop()
        y.set(share(Math.max(0, dy) / height))
      },
      end: (_, dy) => {
        if (!moved.current) return
        const now = performance.now()
        const from = seen.find(([at]) => now - at <= RECENT)
        const speed = from && now > from[0] ? ((dy - from[1]) / (now - from[0])) * 1000 : 0
        if (speed >= FLICK || dy >= height / 2) return props.leave()
        // With reduced motion it is back at once, so whatever follows sets out from its place.
        if (reduced()) y.jump(share(0))
        props.stay()
      },
    })
  }

  return (
    <button
      aria-label={props.label}
      className="drawer__handle"
      // A drag ends in its own way, and the click a mouse makes after it is let pass; a press, or Enter and Space,
      // whose click counts no press of a pointer, puts the drawer away.
      onClick={(event) => (moved.current && event.detail ? (moved.current = false) : props.leave())}
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
