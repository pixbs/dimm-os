'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { curve, duration, reduced, usePainted } from './vocabulary'

type Props = {
  open: boolean
  // What opened the part, when that is an element.
  opener?: Element | null
  speed: 'fast' | 'slow'
  className?: string
  children: ReactNode
}

// The size a part opens from at its own place.
const start = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--m-start'))

// The centre of the opener, when it is on screen.
function centre(opener?: Element | null) {
  const at = opener?.getBoundingClientRect()
  const seen =
    at && at.width && at.bottom > 0 && at.right > 0 && at.top < innerHeight && at.left < innerWidth
  return seen ? { x: at.left + at.width / 2, y: at.top + at.height / 2 } : null
}

// A part grows out of the centre of what opened it and closes back into it; with no opener on
// screen it opens from just under its size at its own place, and with reduced motion it fades.
export function Origin({ open, opener, speed, className, children }: Props) {
  const part = useRef<HTMLDivElement>(null)
  const painted = usePainted()

  // The point the part scales about is measured as it opens and again as it closes, wherever both are by then.
  useLayoutEffect(() => {
    if (!part.current) return
    const from = !reduced() && centre(opener)
    const box = part.current.getBoundingClientRect()
    const [x, y] = getComputedStyle(part.current).transformOrigin.split(' ').map(parseFloat)
    // A part caught in flight has shrunk towards the point it scales about: that is undone to find its corner.
    const shrunk = 1 - box.width / part.current.offsetWidth
    part.current.style.transformOrigin = from
      ? `${from.x - box.left + x * shrunk}px ${from.y - box.top + y * shrunk}px`
      : ''
  }, [open, opener])

  const variants = {
    open: () => ({
      opacity: 1,
      scale: 1,
      transition: { duration: duration(speed), ease: curve('enter') },
    }),
    closed: () => ({
      opacity: 0,
      scale: reduced() ? 1 : centre(opener) ? 0 : start(),
      transition: { duration: duration(`${speed}-exit`), ease: curve('exit') },
    }),
  }

  return (
    <AnimatePresence initial={!painted}>
      {open && (
        <m.div
          animate="open"
          className={className}
          exit="closed"
          initial="closed"
          ref={part}
          // The server has no tokens to read, and what it painted stays as it is.
          variants={painted ? undefined : variants}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
}
