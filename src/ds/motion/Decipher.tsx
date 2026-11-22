'use client'

import { useLayoutEffect, useRef } from 'react'

import { amount, duration, reduced, usePainted } from './vocabulary'

const letter = /[\p{L}\p{N}]/u

// How long a text takes to decode, in ms: a letter at a time, and never longer than the most.
const timeOf = (text: string) =>
  Math.min([...text].length * duration('letter'), duration('decode')) * 1000

// A text decoded from its start into the element given: what is read is itself, a run of its own letters travels
// ahead, past the run nothing shows yet, and what is not a letter or a digit stays itself. A count shows whole, only
// the digits of its first number changing until it is read. Once read it empties.
function decoder(
  shown: HTMLElement,
  text: string,
  total: number,
  done?: () => void,
  count = false,
) {
  const letters = [...text]
  const others = letters.filter((one) => letter.test(one))
  const run = amount('run')
  let frame = 0
  let start = 0

  function show(read: number) {
    shown.textContent =
      read >= letters.length
        ? ''
        : count
          ? text.replace(/\d+/, (digits) =>
              digits.replace(/\d/g, () => String(Math.floor(Math.random() * 10))),
            )
          : letters
              .slice(0, read + run)
              .map((one, at) =>
                at < read || !letter.test(one)
                  ? one
                  : others[Math.floor(Math.random() * others.length)],
              )
              .join('')
  }

  function tick(now: number) {
    start ||= now
    show(Math.floor(((now - start) / total) * letters.length))
    if (shown.textContent) frame = requestAnimationFrame(tick)
    else done?.()
  }

  return {
    cover: () => show(0),
    go: () => (frame = requestAnimationFrame(tick)),
    stop() {
      cancelAnimationFrame(frame)
      shown.textContent = ''
    },
  }
}

// A heading decoded in place: its real text keeps its place unseen under what is read so far, until all of it is.
export function decodes(heading: HTMLElement) {
  const text = heading.textContent ?? ''
  const shown = heading.appendChild(document.createElement('span'))
  shown.setAttribute('aria-hidden', 'true')
  heading.dataset.decode = ''
  const end = () => {
    shown.remove()
    delete heading.dataset.decode
  }
  const decoding = decoder(shown, text, timeOf(text), end)
  return {
    go: decoding.go,
    stop() {
      decoding.stop()
      end()
    },
  }
}

// Mono text deciphers once as it appears or changes, while the real text stays in the page throughout; beside a text,
// as a count beside a title, it settles in a share of the time that text takes.
export function Decipher({ children: text, beside }: { children: string; beside?: string }) {
  const cipher = useRef<HTMLSpanElement>(null)
  // The text the server painted, which does not animate in.
  const painted = useRef(usePainted() ? text : null)
  // The text it showed before, which a count keeps until it settles.
  const was = useRef(text)

  // Before paint, so the new text is covered before it is ever seen.
  useLayoutEffect(() => {
    const shown = cipher.current!
    if (painted.current === text) return
    painted.current = null
    if (reduced()) return

    const total = beside === undefined ? timeOf(text) : timeOf(beside) * amount('settle')
    const decoding = decoder(shown, text, total, undefined, beside !== undefined)
    if (beside === undefined) decoding.cover()
    else shown.textContent = was.current
    was.current = text

    // Off screen nothing runs: it deciphers when it is first seen, and beside a title once what its window holds has
    // stopped waiting, as the title begins to be decoded.
    let waits: MutationObserver | undefined
    const watcher = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      watcher.disconnect()
      const held =
        beside === undefined ? null : shown.closest('article')?.querySelector('[data-hold]')
      if (!held) return void decoding.go()
      waits = new MutationObserver(() => {
        if (held.hasAttribute('data-hold')) return
        waits!.disconnect()
        decoding.go()
      })
      waits.observe(held, { attributeFilter: ['data-hold'] })
    })
    watcher.observe(shown)

    return () => {
      watcher.disconnect()
      waits?.disconnect()
      decoding.stop()
    }
  }, [text, beside])

  return (
    <span className="decipher">
      <span aria-hidden ref={cipher} />
      <span>{text}</span>
    </span>
  )
}
