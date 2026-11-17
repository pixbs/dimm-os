'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

import { usePainted } from './vocabulary'

// The top of an element in the page as laid out, which a transform in flight does not move.
const top = (element: Element | null): number =>
  element instanceof HTMLElement ? element.offsetTop + top(element.offsetParent) : 0

function scroller(element: HTMLElement) {
  for (let at = element.parentElement; at; at = at.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(at).overflowY)) return at
  }
  return null
}

// What comes into view in one frame arrives as one sweep, in its order.
let arriving: HTMLElement[] = []
function arrive(element: HTMLElement) {
  if (!arriving.length) {
    requestAnimationFrame(() => {
      arriving.forEach((one, at) => {
        one.style.transitionDelay = `calc(var(--m-spread) * ${at} / ${arriving.length})`
        one.dataset.enter = 'in'
      })
      arriving = []
    })
  }
  arriving.push(element)
}

// The parts of what this marks arrive as they are first seen, those seen together in one sweep along the spread, and
// then keep their own transitions; what the server painted is simply there.
export function useArrives() {
  const whole = useRef<HTMLDivElement>(null)
  const server = useRef(usePainted())

  // Before paint, so a part is never seen before it arrives.
  useLayoutEffect(() => {
    const element = whole.current
    if (!element || server.current) return
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const { isIntersecting, target } of entries) {
          if (!isIntersecting) continue
          watcher.unobserve(target)
          arrive(target as HTMLElement)
        }
      },
      { root: scroller(element) },
    )
    const settle = ({ target }: Event) => {
      const part = target as HTMLElement
      if (part.parentElement !== element || part.dataset.enter !== 'in') return
      delete part.dataset.enter
      part.style.transitionDelay = ''
    }
    for (const part of element.children) {
      ;(part as HTMLElement).dataset.enter = 'wait'
      watcher.observe(part)
    }
    element.addEventListener('transitionend', settle)
    return () => {
      watcher.disconnect()
      element.removeEventListener('transitionend', settle)
    }
  }, [])

  return whole
}

// The part this marks enters by scroll and plays once, as it comes into view; in view as it arrives it comes with
// what holds it, and what the server painted is simply there.
export function useEnters() {
  const part = useRef<HTMLElement>(null)
  const server = useRef(usePainted())

  useEffect(() => {
    const element = part.current
    const view = element && scroller(element)
    // A window not laid out yet has no height to scroll: it shows its sections as it shows itself.
    if (!element || !view || server.current || !view.clientHeight) return
    if (top(element) - top(view) - view.scrollTop < view.clientHeight) return

    element.dataset.enter = 'wait'
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        watcher.disconnect()
        arrive(element)
      },
      { root: view },
    )
    watcher.observe(element)
    return () => watcher.disconnect()
  }, [])

  return part
}
