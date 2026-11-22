'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

import { decodes } from './Decipher'
import { amount, duration, reduced, usePainted } from './vocabulary'

// The top of an element in the page as laid out, which a transform in flight does not move.
const top = (element: Element | null): number =>
  element instanceof HTMLElement ? element.offsetTop + top(element.offsetParent) : 0

function scroller(element: HTMLElement) {
  for (let at = element.parentElement; at; at = at.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(at).overflowY)) return at
  }
  return null
}

// A view held until its window has opened keeps what arrives in it until it lets go.
const held = new Map<Element, HTMLElement[]>()
// What starts at its turn instead of rising, as a decoded title does, given its delay in ms.
const starts = new WeakMap<Element, (delay: number) => void>()
const inOrder = (one: Node, other: Node) =>
  one.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

// What comes into view in one frame arrives in reading order, each part the next after the one before, up to the last
// that takes a turn of its own: the rest arrive with it.
let arriving: HTMLElement[] = []
function arrive(element: HTMLElement) {
  const hold = element.closest('[data-hold]')
  const keep = hold && held.get(hold)
  if (keep) return void keep.push(element)
  if (!arriving.length) {
    requestAnimationFrame(() => {
      const last = amount('nexts') - 1
      arriving.sort(inOrder).forEach((one, at) => {
        const turn = Math.min(at, last)
        const start = starts.get(one)
        if (start) return start(turn * duration('next') * 1000)
        one.style.animationDelay = `calc(var(--m-next) * ${turn})`
        one.dataset.enter = 'in'
      })
      arriving = []
    })
  }
  arriving.push(element)
}

function letGo(view: HTMLElement) {
  const parts = held.get(view) ?? []
  held.delete(view)
  delete view.dataset.hold
  parts.forEach(arrive)
}

// The parts given arrive as they are first seen, and then are as they were; one whose arrival is cut short, as its
// window is minimised, settles all the same.
function watch(root: HTMLElement, parts: HTMLElement[]) {
  const own = new Set(parts)
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue
        watcher.unobserve(target)
        arrive(target as HTMLElement)
      }
    },
    { root: scroller(root) },
  )
  const settle = ({ target }: Event) => {
    const part = target as HTMLElement
    if (!own.has(part) || part.dataset.enter !== 'in') return
    delete part.dataset.enter
    part.style.animationDelay = ''
  }
  for (const part of parts) {
    part.dataset.enter = 'wait'
    watcher.observe(part)
  }
  root.addEventListener('animationend', settle)
  root.addEventListener('animationcancel', settle)
  return () => {
    watcher.disconnect()
    root.removeEventListener('animationend', settle)
    root.removeEventListener('animationcancel', settle)
    for (const part of parts) if (part.dataset.enter === 'wait') delete part.dataset.enter
  }
}

// What arrives of a view on its own: what holds text of its own, a picture, a control or a row. A control or a drawing,
// whatever has a role or is hidden from assistive technology or holds no text, arrives as one. A box that holds only boxes is walked through; what arrives by itself,
// what Motion moves, and what has no box are left as they are.
const whole =
  'h1, h2, h3, h4, h5, h6, p, a, button, img, picture, figure, canvas, video, hr, li, tr, dt, dd, blockquote, pre, input, select, textarea, label, [role]:not([role="none"], [role="presentation"]), [aria-hidden="true"]'
const single = (part: HTMLElement) =>
  part.matches(whole) ||
  !part.textContent!.trim() ||
  ![...part.children].some((child) => child instanceof HTMLElement) ||
  [...part.childNodes].some((node) =>
    node instanceof HTMLElement
      ? getComputedStyle(node).display === 'inline'
      : node.nodeType === Node.TEXT_NODE && node.textContent!.trim(),
  )
function partsOf(box: Element, title: Element | null): HTMLElement[] {
  return [...box.children].flatMap((part) => {
    if (!(part instanceof HTMLElement) || part === title || 'enter' in part.dataset) return []
    if (part.style.opacity || part.style.transform) return []
    const { display } = getComputedStyle(part)
    if (display === 'contents' || part.contains(title)) return partsOf(part, title)
    if (display === 'none' || !part.getClientRects().length) return []
    return single(part) ? [part] : partsOf(part, title)
  })
}

// What a view holds arrives once its window has opened, after what it replaces has left: its title, the first heading,
// is decoded and every other part rises in reading order, those below the fold as they are first seen. What the
// server painted, or with reduced motion, is simply there.
export function useArrival(open: boolean, replaces: boolean) {
  const whole = useRef<HTMLDivElement>(null)
  const server = useRef(usePainted())

  // Before paint, so a part is never seen before it arrives.
  useLayoutEffect(() => {
    const view = whole.current
    if (!view || server.current || reduced()) return
    view.dataset.hold = ''
    held.set(view, [])
    const title = view.querySelector<HTMLElement>('h1, h2')
    const decoding = title && decodes(title)
    let timer = 0
    if (decoding) {
      starts.set(title, (delay) => (timer = window.setTimeout(decoding.go, delay)))
      arrive(title)
    }
    const stop = watch(view, partsOf(view, title))
    return () => {
      stop()
      clearTimeout(timer)
      decoding?.stop()
      held.delete(view)
      delete view.dataset.hold
    }
  }, [])

  useEffect(() => {
    const view = whole.current
    if (!open || !view?.hasAttribute('data-hold')) return
    const timer = setTimeout(() => letGo(view), replaces ? duration('fast-exit') * 1000 : 0)
    return () => clearTimeout(timer)
  }, [open, replaces])

  return whole
}

// The parts of what this marks arrive as they are first seen, those seen together one after another, and then keep
// their own transitions; what the server painted, or with reduced motion, is simply there.
export function useArrives() {
  const whole = useRef<HTMLDivElement>(null)
  const server = useRef(usePainted())

  // Before paint, so a part is never seen before it arrives.
  useLayoutEffect(() => {
    const element = whole.current
    if (!element || server.current || reduced()) return
    return watch(element, [...element.children] as HTMLElement[])
  }, [])

  return whole
}

// The part this marks enters by scroll and plays once, as it comes into view; in view as it arrives it comes with
// what holds it, and what the server painted, with reduced motion or with parts that arrive on their own, is simply
// there.
export function useEnters() {
  const part = useRef<HTMLElement>(null)
  const server = useRef(usePainted())

  useEffect(() => {
    const element = part.current
    const view = element && scroller(element)
    // A window not laid out yet has no height to scroll: it shows its sections as it shows itself.
    if (!element || !view || server.current || reduced() || !view.clientHeight) return
    if (element.querySelector('[data-enter]')) return
    if (top(element) - top(view) - view.scrollTop < view.clientHeight) return
    return watch(element, [element])
  }, [])

  return part
}
