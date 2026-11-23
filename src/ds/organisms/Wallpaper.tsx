'use client'

import { useEffect, useRef } from 'react'

import { useSetting } from '../atoms/useSetting'
import { curve, duration, reduced, still } from '../motion/vocabulary'
import type { Setting } from './wallpaper'
import { step } from './wallpapers'

// Starts the worker that draws into a canvas of its own, and returns what stops it.
function start(box: HTMLElement, copy: boolean) {
  // A canvas can hand its drawing over only once, so each start brings its own.
  const canvas = box.appendChild(document.createElement('canvas'))
  const worker = new Worker(new URL('./wallpaper.ts', import.meta.url), { type: 'module' })
  const offscreen = canvas.transferControlToOffscreen()
  worker.postMessage({ canvas: offscreen }, [offscreen])

  // A copy follows neither the pointer nor the desk it stands on.
  const screen = copy ? null : canvas.closest('.screen')
  const desk = screen?.querySelector('.screen__desk')
  // A screen that waits over the desk stands beside it, and the pointer over its open ground is over the wallpaper.
  const room = screen?.parentElement
  const send = (setting: Partial<Setting>) => worker.postMessage(setting)
  let seen = true
  let drawn: string | undefined

  // The apps lie on the desk, so a window in full screen covers the wallpaper when it covers them.
  const ground = desk?.querySelector('.apps') ?? desk ?? canvas
  // It holds still while the tab is hidden, the desk covered, or the screen off screen; a screen that waits over the
  // desk leaves it seen.
  const runs = () => !document.hidden && [null, screen].includes(ground.closest('[inert]')) && seen
  function set() {
    const style = getComputedStyle(canvas)
    // The step in force is the setting of the nearest part that names one: the root, as Preferences sets it.
    const shown = step(canvas.closest<HTMLElement>('[data-wallpaper]')?.dataset.wallpaper)
    // In colour it stands stronger than in ink alone.
    box.toggleAttribute('data-colour', shown.colour)
    // Another wallpaper fades in as it begins.
    if (drawn && drawn !== shown.wallpaper && !reduced())
      box.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: duration('slow') * 1000,
        easing: `cubic-bezier(${curve('enter')})`,
      })
    drawn = shown.wallpaper
    // A copy lays the scene out as on the screen it copies, and draws it as small as its monitor.
    const scale = copy && canvas.clientWidth ? innerWidth / canvas.clientWidth : 1
    send({
      width: canvas.clientWidth * scale,
      height: canvas.clientHeight * scale,
      ratio: Math.min(2, devicePixelRatio || 1) / scale,
      // A copy is drawn on twice the dot.
      pitch: parseFloat(style.getPropertyValue('--pitch')) * (copy ? 2 : 1),
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

  // It reads the pointer over the desk, not through a window, and a press there until it is let go anywhere.
  const open = (over: Element) =>
    over === screen ||
    over.matches('.screen[data-waiting], .screen[data-waiting] > .screen__main') ||
    (!!desk?.contains(over) && !over.closest('article, section'))
  function point(event: PointerEvent) {
    const box = canvas.getBoundingClientRect()
    send({
      pointer: open(event.target as Element)
        ? [event.clientX - box.left, event.clientY - box.top]
        : null,
    })
  }
  function press(event: PointerEvent) {
    point(event)
    if (open(event.target as Element)) send({ held: true })
  }
  const away = () => send({ pointer: null })
  const release = () => send({ held: false })
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
  room?.addEventListener('pointermove', point as EventListener)
  room?.addEventListener('pointerleave', away)
  room?.addEventListener('pointerdown', press as EventListener)
  for (const type of ['pointerup', 'pointercancel']) addEventListener(type, release)

  return () => {
    sized.disconnect()
    settings.disconnect()
    covered.disconnect()
    watcher.disconnect()
    document.removeEventListener('visibilitychange', wake)
    room?.removeEventListener('pointermove', point as EventListener)
    room?.removeEventListener('pointerleave', away)
    room?.removeEventListener('pointerdown', press as EventListener)
    for (const type of ['pointerup', 'pointercancel']) removeEventListener(type, release)
    worker.terminate()
    canvas.remove()
  }
}

// A scene behind everything, drawn by a worker in dots or in signs, or a copy of it in a monitor. A plain wallpaper
// is not drawn.
export function Wallpaper({ copy = false }: { copy?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const plain = useSetting('plain') === 'on'

  useEffect(() => {
    if (plain) return
    // It starts a task after the page is in place, so a mount that is undone at once starts no worker.
    let stop = () => {}
    const timer = setTimeout(() => (stop = start(box.current!, copy)))
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [plain, copy])

  return <div aria-hidden className="wallpaper" ref={box} />
}
