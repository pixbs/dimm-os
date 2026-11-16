'use client'

import { useEffect, useRef, useState } from 'react'

import type { Named } from '@/i18n/keys'

import { Origin } from '../motion/Origin'
import { ForDevice } from './Key'
import { Tag } from './Tag'

export function Tooltip({ label, hint }: { label: string; hint?: Named }) {
  return (
    <span className="tip" data-surface="raised">
      {label}
      {hint && (
        <Tag>
          <ForDevice text={hint} />
        </Tag>
      )}
    </span>
  )
}

// Names what holds it while the pointer is on it or the keyboard has reached it; a press or Esc puts it away.
export function Tip(props: { label: string; hint?: Named }) {
  const at = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const host = at.current!.parentElement!
    let shown = false
    const show = (open: boolean) => {
      shown = open
      setOpen(open)
    }
    const listeners = {
      pointerenter: () => show(true),
      pointerleave: () => show(false),
      pointerdown: (event: Event) => !at.current!.contains(event.target as Node) && show(false),
      // The tooltip can be pointed at, but a press on it does not press what it names.
      click: (event: Event) => {
        if (!at.current!.contains(event.target as Node)) return
        event.preventDefault()
        event.stopPropagation()
      },
      focusin: () => show(host.matches(':focus-visible')),
      focusout: () => show(false),
      // Esc puts an open tooltip away and does nothing else, so the window it stands on stays.
      keydown: (event: Event) => {
        if ((event as KeyboardEvent).key !== 'Escape' || !shown) return
        event.preventDefault()
        show(false)
      },
    }
    for (const [type, listener] of Object.entries(listeners)) host.addEventListener(type, listener)

    return () => {
      for (const [type, listener] of Object.entries(listeners)) {
        host.removeEventListener(type, listener)
      }
    }
  }, [])

  return (
    // What it holds is the name the button already has.
    <span aria-hidden className="tip-at" ref={at}>
      <Origin inline open={open} speed="fast">
        <Tooltip {...props} />
      </Origin>
    </span>
  )
}
