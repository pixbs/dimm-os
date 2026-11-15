'use client'

import { useEffect, useRef } from 'react'

import { duration, reduced, usePainted } from './vocabulary'

// Mono text deciphers once as it appears or changes: its letters flicker through others of the
// same string and lock from the first to the last. The real text stays in the page throughout.
export function Decipher({ children: text }: { children: string }) {
  const cipher = useRef<HTMLSpanElement>(null)
  // The text the server painted, which does not animate in.
  const painted = useRef(usePainted() ? text : null)

  useEffect(() => {
    const shown = cipher.current!
    if (painted.current === text || reduced()) return
    painted.current = null

    const letters = [...text]
    // A space stays a space, so the words keep their shape.
    const others = letters.filter((letter) => letter !== ' ')
    const total = duration('slow') * 1000
    let frame = 0
    let start = 0

    function tick(now: number) {
      start ||= now
      const locked = ((now - start) / total) * letters.length
      shown.textContent =
        locked < letters.length
          ? letters
              .map((letter, at) =>
                at < locked || letter === ' '
                  ? letter
                  : others[Math.floor(Math.random() * others.length)],
              )
              .join('')
          : ''
      if (shown.textContent) frame = requestAnimationFrame(tick)
    }

    // Off screen nothing runs: it deciphers when it is first seen.
    const watcher = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      watcher.disconnect()
      frame = requestAnimationFrame(tick)
    })
    watcher.observe(shown)

    return () => {
      watcher.disconnect()
      cancelAnimationFrame(frame)
      shown.textContent = ''
    }
  }, [text])

  return (
    <span className="decipher">
      <span aria-hidden ref={cipher} />
      <span>{text}</span>
    </span>
  )
}
