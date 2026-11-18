'use client'

import { useEffect, useRef } from 'react'

import { TICK } from './engine'
import { still } from './vocabulary'

// Each number of a shape at rest, and where it goes as the gaze turns right, left, down and up.
type Spec = { parts: string[]; nums: Record<'c' | 'r' | 'l' | 'd' | 'u', number[]> }
type Drawing = {
  elements: { tag: string; lookIndex: string; attrs: Record<string, string> }[]
  specs: Record<string, Record<string, Spec>>
  blink: Record<'leftLid' | 'rightLid' | 'leftPupil' | 'rightPupil', string>
}

const NS = 'http://www.w3.org/2000/svg'
const SIZE = 171
const clamp = (value: number, low: number, high: number) =>
  Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : 0
const between = (low: number, high: number) => low + Math.random() * (high - low)
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function at({ nums }: Spec, x: number, y: number) {
  const [right, left, down, up] = [Math.max(0, x), Math.max(0, -x), Math.max(0, y), Math.max(0, -y)]
  return nums.c.map(
    (c, i) =>
      c +
      (nums.r[i] - c) * right +
      (nums.l[i] - c) * left +
      (nums.d[i] - c) * down +
      (nums.u[i] - c) * up,
  )
}
const join = (parts: string[], values: number[]) =>
  values.reduce((out, value, i) => out + parts[i] + Math.round(value * 10000) / 10000, '') +
  parts[parts.length - 1]

// A lid closes toward the middle of its pupil, its corners least.
function lid(values: number[], middle: number, shut: number) {
  const reach = [0.95, 0.4, 0.05, 0, 0, 0.05, 0.4, 0.95]
  return values.map((value, i) =>
    i % 2 && shut ? value + (middle + (reach[(i - 1) / 2] ?? 0) - value) * shut : value,
  )
}

// How far closed the eyes are, a moment after a blink began, and whether it is over.
function blinking(since: number): [number, boolean] {
  if (since < 0) return [0, false]
  if (since < 115) return [ease(since / 115), false]
  if (since < 160) return [1, false]
  if (since < 325) return [1 - ease((since - 160) / 165), false]
  return [0, true]
}

function draw(host: HTMLElement, drawing: Drawing) {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`)
  svg.setAttribute('preserveAspectRatio', 'xMaxYMax meet')
  svg.setAttribute('aria-hidden', 'true')
  const id = `portrait-${Math.random().toString(36).slice(2, 8)}`
  const clip = document.createElementNS(NS, 'clipPath')
  clip.id = id
  // Square, so the shirt runs to the foot of whatever holds it.
  const square = document.createElementNS(NS, 'rect')
  square.setAttribute('width', String(SIZE))
  square.setAttribute('height', String(SIZE))
  clip.append(square)
  const group = document.createElementNS(NS, 'g')
  group.setAttribute('clip-path', `url(#${id})`)
  const shapes: Record<string, SVGElement> = {}
  for (const { tag, lookIndex, attrs } of drawing.elements) {
    const shape = document.createElementNS(NS, tag)
    for (const [name, value] of Object.entries(attrs))
      shape.setAttribute(
        name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
        value,
      )
    shapes[lookIndex] = shape
    group.append(shape)
  }
  svg.append(clip, group)
  host.append(svg)
  return { svg, shapes }
}

// The line portrait carried over from the earlier site. It looks at the pointer, or at a tap; left alone it holds looks
// of random length, at the visitor, to a side, up, sets off fast and lands softly, and blinks when it likes. Held still,
// it looks at the visitor. Its drawing is fetched only when it shows.
export default function Portrait() {
  const host = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const box = host.current!
    let stop = () => {}
    let gone = false
    import('./portrait.json').then(({ default: drawing }) => {
      if (!gone) stop = look(box, drawing as unknown as Drawing)
    })
    return () => {
      gone = true
      stop()
    }
  }, [])

  return <span className="portrait" ref={host} />
}

function look(box: HTMLElement, drawing: Drawing) {
  const { svg, shapes } = draw(box, drawing)
  const { specs, blink: eyes } = drawing
  let shut = 0

  function turn(x: number, y: number) {
    for (const [index, attrs] of Object.entries(specs)) {
      for (const [name, spec] of Object.entries(attrs))
        shapes[index]?.setAttribute(name, join(spec.parts, at(spec, x, y)))
    }
    for (const side of ['left', 'right'] as const) {
      const lidOf = specs[eyes[`${side}Lid`]]?.d
      const pupil = specs[eyes[`${side}Pupil`]]
      if (!lidOf || !pupil) continue
      const middle = pupil.cy ? at(pupil.cy, x, y)[0] : 0
      shapes[eyes[`${side}Lid`]].setAttribute(
        'd',
        join(lidOf.parts, lid(at(lidOf, x, y), middle, shut)),
      )
      const ball = shapes[eyes[`${side}Pupil`]]
      if (pupil.r)
        ball.setAttribute(
          'r',
          String(Math.max(0.001, at(pupil.r, x, y)[0] * Math.max(0, 1 - shut * 1.3))),
        )
      ball.setAttribute('opacity', shut > 0.96 ? '0' : '1')
    }
  }

  // Where it looks, where it is headed, when the pointer last moved, and when it next blinks, in ms.
  let gaze = { x: 0, y: 0 }
  let target = { x: 0, y: 0 }
  let pointed = -Infinity
  let blinkAt = 0
  let hold = { x: 0, y: 0, until: 0, phase: Math.random() * 6 }
  let idleBefore = true
  let time = 0

  const schedule = () =>
    (blinkAt = time + (Math.random() < 0.16 ? between(180, 300) : between(1900, 5600)))
  // A look at the visitor, one to a side, or one up to think, each held for its own while; a far one is often blinked.
  function refix(home: boolean) {
    const kind = home ? 0 : Math.random()
    const [x, y, span] =
      kind < 0.36
        ? [between(-0.08, 0.08), between(-0.05, 0.06), between(1600, 4200)]
        : kind < 0.84
          ? [
              (Math.random() < 0.5 ? -1 : 1) * between(0.26, 0.78),
              between(-0.16, 0.2),
              between(700, 2400),
            ]
          : [between(-0.34, 0.34), between(-0.5, -0.2), between(900, 2000)]
    if (Math.hypot(x - hold.x, y - hold.y) > 0.5 && Math.random() < 0.6 && blinkAt - time > 400)
      blinkAt = time + between(20, 90)
    hold = { x, y, until: time + span, phase: hold.phase }
  }

  function step() {
    time += TICK
    if (!blinkAt) schedule()
    const idle = time - pointed > 2600
    if (idle) {
      if (!idleBefore) refix(true)
      else if (time > hold.until) refix(false)
      // While a look is held the eyes are never quite still.
      target = {
        x: hold.x + Math.sin(time / 830 + hold.phase) * 0.012,
        y: hold.y + Math.cos(time / 1130 + hold.phase) * 0.01,
      }
    }
    idleBefore = idle
    const [closed, over] = blinking(time - blinkAt)
    shut = closed
    if (over) schedule()
    // A glance starts fast and lands softly: the farther the look, the quicker it sets off.
    const dx = target.x - gaze.x
    const dy = target.y - gaze.y
    const k = idle ? Math.min(0.22, 0.07 + Math.hypot(dx, dy) * 0.16) : 0.12
    gaze = { x: gaze.x + dx * k, y: gaze.y + dy * k }
  }

  // Diagonals keep the full sideways turn; the turn up or down eases to 0.6 at the corners.
  function show() {
    const x = clamp(gaze.x, -1, 1)
    turn(x, clamp(gaze.y, -1, 1) * (1 - 0.4 * Math.abs(x)))
  }

  let seen = false
  let request = 0
  let before: number | undefined
  let owed = 0
  function frame(now: number) {
    // A frame that comes late counts as five ticks at most, so it moves at one speed on every screen.
    owed += before === undefined ? TICK : Math.min(now - before, TICK * 5)
    before = now
    for (; owed >= TICK; owed -= TICK) step()
    show()
    request = requestAnimationFrame(frame)
  }

  // Nothing runs while the tab is hidden, the portrait is off screen or covered; held still, it looks at the visitor.
  function wake() {
    const runs = seen && !document.hidden && !box.closest('[inert]') && !still()
    if (runs && !request) {
      before = undefined
      owed = 0
      request = requestAnimationFrame(frame)
    }
    if (!runs) {
      cancelAnimationFrame(request)
      request = 0
    }
    if (still()) {
      gaze = target = { x: 0, y: 0 }
      shut = 0
      show()
    }
  }

  function toward(event: PointerEvent) {
    const { left, top, width, height } = svg.getBoundingClientRect()
    if (!width) return
    target = {
      x: (event.clientX - (left + width / 2)) / (width / 2),
      y: (event.clientY - (top + height / 2)) / (height / 2),
    }
    pointed = time
  }

  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  const watcher = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting
    wake()
  })
  const settings = new MutationObserver(wake)

  show()
  watcher.observe(box)
  settings.observe(document.documentElement, { attributes: true })
  settings.observe(document.body, { attributeFilter: ['inert'], subtree: true })
  document.addEventListener('visibilitychange', wake)
  if (fine) window.addEventListener('pointermove', toward, { passive: true })
  box.addEventListener('pointerdown', toward, { passive: true })

  return () => {
    cancelAnimationFrame(request)
    watcher.disconnect()
    settings.disconnect()
    document.removeEventListener('visibilitychange', wake)
    window.removeEventListener('pointermove', toward)
    box.removeEventListener('pointerdown', toward)
    svg.remove()
  }
}
