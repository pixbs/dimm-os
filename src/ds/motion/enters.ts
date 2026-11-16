'use client'

import { useEffect, useRef } from 'react'

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

// The part this marks enters by scroll and plays once, as it comes into view; in view as it arrives it comes with
// what holds it, and what the server painted is simply there.
export function useEnters() {
  const part = useRef<HTMLElement>(null)
  const server = useRef(usePainted())

  useEffect(() => {
    const element = part.current
    const view = element && scroller(element)
    if (!element || !view || server.current) return
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
