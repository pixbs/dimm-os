'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { duration } from '../motion/vocabulary'
import { place } from './form'

// A small copy of the screen with the settings in force: the wallpaper's form of the field, the window that opens
// at start, and the boot playing once each time `boot` counts up.
export function Monitor({ field, boot }: { field: number; boot: number }) {
  const screen = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<{ x: number; y: number; r: number } | null>(null)
  // The count of boots that have played out: one more is playing.
  const [played, setPlayed] = useState(boot)

  // The form stands where the wallpaper's does, on a screen of this shape.
  useLayoutEffect(() => {
    const element = screen.current!
    const measure = () =>
      setForm(
        place({
          width: element.clientWidth,
          height: element.clientHeight,
          at: getComputedStyle(element)
            .getPropertyValue('--wallpaper-at')
            .trim()
            .split(/\s+/)
            .map((share) => parseFloat(share) / 100),
          field,
        }),
      )
    measure()
    const sized = new ResizeObserver(measure)
    sized.observe(element)
    return () => sized.disconnect()
  }, [field])

  useEffect(() => {
    const timer = setTimeout(() => setPlayed(boot), duration('long') * 1000)
    return () => clearTimeout(timer)
  }, [boot])

  return (
    <div aria-hidden className="monitor" data-surface="desktop" ref={screen}>
      {form && (
        <span
          className="halftone monitor__wall"
          style={{
            left: form.x - form.r,
            top: form.y - form.r,
            width: form.r * 2,
            height: form.r * 2,
          }}
        />
      )}
      <span className="monitor__apps">
        {(['orange', 'blue', 'mint', 'paper'] as const).map((surface) => (
          <span className="mark" data-surface={surface} key={surface} />
        ))}
      </span>
      <span className="monitor__win" data-surface="window">
        <span data-surface="paper" />
        <span data-surface="orange" />
      </span>
      <span className="monitor__task" />
      <span className="monitor__bar">
        <span className="mark" data-surface="orange" />
      </span>
      <AnimatePresence>
        {boot > played && (
          <m.span
            className="monitor__boot"
            animate={{ opacity: 1, transition: { duration: duration('fast') } }}
            data-surface="desktop"
            initial={{ opacity: 0 }}
            exit={{ opacity: 0, transition: { duration: duration('slow-exit') } }}
          >
            <span className="mark" data-surface="orange" />
          </m.span>
        )}
      </AnimatePresence>
    </div>
  )
}
