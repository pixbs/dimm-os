'use client'

import { useEffect, useRef } from 'react'

import { useSetting } from '../atoms/useSetting'
import { still } from '../motion/vocabulary'
import type { Setting } from './wallpaper'
import { step } from './wallpapers'

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
    // The step in force is the setting of the nearest part that names one: the root, as Preferences sets it.
    const shown = step(canvas.closest<HTMLElement>('[data-wallpaper]')?.dataset.wallpaper)
    // In colour it stands stronger than in ink alone.
    box.toggleAttribute('data-colour', shown.colour)
    send({
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      ratio: Math.min(2, devicePixelRatio || 1),
      pitch: parseFloat(style.getPropertyValue('--pitch')),
      step: shown,
      // On a light surface the paper ink is the ink of the theme.
      inks: [
        style.color,
        ...['orange', 'blue', 'mint'].map((ink) => style.getPropertyValue(`--${ink}`)),
      ],
      runs: runs(),
      still: still(),
    })
  }

  // It reads the pointer over the desk, not through a window.
  function point(event: PointerEvent) {
    const box = canvas.getBoundingClientRect()
    const over = event.target as Element
    const open = over === screen || (!!desk?.contains(over) && !over.closest('article, section'))
    send({ pointer: open ? [event.clientX - box.left, event.clientY - box.top] : null })
  }
  const away = () => send({ pointer: null })
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

// A scene behind everything, drawn by a worker in dots or in signs. A plain wallpaper is not drawn.
export function Wallpaper() {
  const box = useRef<HTMLDivElement>(null)
  const plain = useSetting('plain') === 'on'

  useEffect(() => {
    if (plain) return
    // It starts a task after the page is in place, so a mount that is undone at once starts no worker.
    let stop = () => {}
    const timer = setTimeout(() => (stop = start(box.current!)))
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [plain])

  return <div aria-hidden className="wallpaper" ref={box} />
}
