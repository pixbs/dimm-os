'use client'

import { useEffect, useRef } from 'react'

import { duration, still } from '../motion/vocabulary'
import type { Setting } from './wallpaper'

// Starts the worker that draws into a canvas of its own, and returns what stops it.
function start(box: HTMLElement) {
  // A canvas can hand its drawing over only once, so each start brings its own.
  const canvas = box.appendChild(document.createElement('canvas'))
  const worker = new Worker(new URL('./wallpaper.ts', import.meta.url), { type: 'module' })
  const offscreen = canvas.transferControlToOffscreen()
  worker.postMessage({ canvas: offscreen }, [offscreen])

  const screen = canvas.closest('.screen')
  const desk = screen?.querySelector('.screen__desk')
  const send = (setting: Partial<Setting>) => worker.postMessage(setting)
  let seen = true

  // The apps lie on the desk, so a window in full screen covers the wallpaper when it covers them.
  const ground = desk?.querySelector('.apps') ?? desk ?? canvas
  // It holds still while the tab is hidden, the desk covered, or the screen off screen.
  const runs = () => !document.hidden && !ground.closest('[inert]') && seen
  function set() {
    const style = getComputedStyle(canvas)
    send({
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      ratio: Math.min(2, devicePixelRatio || 1),
      pitch: parseFloat(style.getPropertyValue('--pitch')),
      at: style
        .getPropertyValue('--wallpaper-at')
        .trim()
        .split(/\s+/)
        .map((share) => parseFloat(share) / 100) as [number, number],
      field: Number(document.documentElement.dataset.wallpaper),
      colour: style.color,
      spread: duration('spread') * 1000,
      runs: runs(),
      still: still(),
    })
  }

  // It leans toward the pointer only over the empty desk: not over an app, a link or a window.
  function point(event: PointerEvent) {
    const box = canvas.getBoundingClientRect()
    const over = event.target as Element
    const empty =
      over === screen || (!!desk?.contains(over) && !over.closest('a, button, article, section'))
    send({ lean: empty ? [event.clientX - box.left, event.clientY - box.top] : null })
  }
  const away = () => send({ lean: null })
  const wake = () => send({ runs: runs() })

  const sized = new ResizeObserver(set)
  sized.observe(canvas)
  const settings = new MutationObserver(set)
  settings.observe(document.documentElement, { attributes: true })
  const covered = new MutationObserver(wake)
  covered.observe(document.body, { attributeFilter: ['inert'], subtree: true })
  const watcher = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting
    wake()
  })
  watcher.observe(canvas)
  document.addEventListener('visibilitychange', wake)
  screen?.addEventListener('pointermove', point as EventListener)
  screen?.addEventListener('pointerleave', away)

  return () => {
    sized.disconnect()
    settings.disconnect()
    covered.disconnect()
    watcher.disconnect()
    document.removeEventListener('visibilitychange', wake)
    screen?.removeEventListener('pointermove', point as EventListener)
    screen?.removeEventListener('pointerleave', away)
    worker.terminate()
    canvas.remove()
  }
}

// One halftone form in paper behind everything, at the strength of a line, drawn by a worker.
export function Wallpaper() {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // It starts a task after the page is in place, so a mount that is undone at once starts no worker.
    let stop = () => {}
    const timer = setTimeout(() => (stop = start(box.current!)))
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [])

  return <div aria-hidden className="wallpaper" ref={box} />
}
