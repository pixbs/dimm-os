'use client'

import { useLayoutEffect, useRef } from 'react'

import { duration, reduced, usePainted } from './vocabulary'

// Mono text deciphers once as it appears or changes, while the real text stays in the page throughout.
export function Decipher({ children: text }: { children: string }) {
  const cipher = useRef<HTMLSpanElement>(null)
  // The text the server painted, which does not animate in.
  const painted = useRef(usePainted() ? text : null)

  // Before paint, so the new text is covered before it is ever seen.
  useLayoutEffect(() => {
    const shown = cipher.current!
    if (painted.current === text) return
    painted.current = null
    if (reduced()) return

    const letters = [...text]
    // A space stays a space, so the words keep their shape.
    const others = letters.filter((letter) => letter !== ' ')
    const total = duration('slow') * 1000
    let frame = 0
    let start = 0

    // Letters before the locked count are themselves, and past the last the cipher empties.
    function show(locked: number) {
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
    }

    function tick(now: number) {
      start ||= now
      show(((now - start) / total) * letters.length)
      if (shown.textContent) frame = requestAnimationFrame(tick)
    }

    show(0)

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
