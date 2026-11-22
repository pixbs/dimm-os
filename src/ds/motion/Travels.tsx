'use client'

import { cubicBezier, type MotionPath } from 'motion/react'
import * as m from 'motion/react-m'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { start } from './Origin'
import { curve, duration, reduced } from './vocabulary'

// How a place looks: its class and what it tells CSS.
type Look = { className?: string; 'aria-hidden'?: boolean } & {
  [data: `data-${string}`]: string | undefined
}

// The surface of a place, which the thing takes on its way.
type Surface = { backgroundColor: string; boxShadow: string }

type Flight = {
  // The thing as it stood where it left, without its surface.
  was: ReactNode
  // Where it lands in the browser's window; without one nothing flies, and it fades.
  box?: DOMRect
  // The surfaces it leaves and lands on, and the share by which its letters grow from one size to the other.
  surfaces?: [Surface, Surface]
  letters?: number
  landed?: boolean
  // The place it left has gone meanwhile, so nothing of the flight is kept once it has landed.
  gone?: boolean
}

const leaving = new Map<string, { was: ReactNode; place: HTMLElement }>()
const landing = new Map<string, HTMLElement>()
const flights = new Map<string, Flight>()
const watchers = new Set<() => void>()

function set(id: string, flight?: Flight) {
  if (flight) flights.set(id, flight)
  else flights.delete(id)
  for (const watcher of watchers) watcher()
}

function watch(watcher: () => void) {
  watchers.add(watcher)
  return () => void watchers.delete(watcher)
}

// Sends the thing under an id from the place it stands in to the place it lands in. With reduced motion, in a browser
// without a top layer to fly in, and to a place that is not shown, it fades out where it was and in where it lands.
export function travel(id: string) {
  const from = leaving.get(id)
  const to = landing.get(id)
  if (!from || !to || flights.has(id)) return
  const box = to.getBoundingClientRect()
  if (reduced() || !('showPopover' in to) || !box.width) return set(id, { was: from.was })
  const [was, lands] = [getComputedStyle(from.place), getComputedStyle(to)]
  // The flyer is drawn at the size it lands in, so a line of the surface it leaves is as much thinner as it is larger.
  const larger = from.place.getBoundingClientRect().width / box.width
  const surface = (style: CSSStyleDeclaration, by = 1) => ({
    backgroundColor: style.backgroundColor,
    boxShadow: style.boxShadow.replace(/[\d.]+(?=px)/g, (length) => String(Number(length) / by)),
  })
  set(id, {
    was: from.was,
    box,
    surfaces: [surface(was, larger), surface(lands)],
    letters: parseFloat(lands.fontSize) / parseFloat(was.fontSize),
  })
}

function land(id: string) {
  const flight = flights.get(id)
  if (flight) set(id, flight.gone ? undefined : { ...flight, landed: true })
}

const centre = { x: 0.5, y: 0.5 }

// The one element that travels. It stands in the top layer, over every screen, as the place it lands in, and Motion
// carries it there from the box of the element that left under its id: its corner across on one curve and up on
// another, its size and surface on the standard one. What it was lies over what it becomes, cut to that box; the
// letters of each grow or shrink from one size to the other, and the first fades into the second during the middle
// half of the move.
function Flyer(props: { id: string; flight: Flight; look: Look; children: ReactNode }) {
  const { id, flight } = props
  const box = flight.box!
  const [move] = useState(() => {
    const [x1, y1, x2, y2] = curve('standard')
    // Motion eases the size on the standard curve, and the moment is read back from it.
    const moment = cubicBezier(y1, x1, y2, x2)
    const across = cubicBezier(...curve('across'))
    const up = cubicBezier(...curve('up'))
    const path: MotionPath = {
      // Motion moves the middle of the box, so half of what it shrinks by goes with its size, and the rest with its corner.
      interpolateProjection: ({ x, y }) => {
        const half = { x: (box.width * (x.scale - 1)) / 2, y: (box.height * (y.scale - 1)) / 2 }
        return (size) => {
          const t = moment(size)
          return {
            x: (x.translate - half.x) * (1 - across(t)) + half.x * (1 - size),
            y: (y.translate - half.y) * (1 - up(t)) + half.y * (1 - size),
          }
        }
      },
    }
    const time = duration('travel')
    const whole = { duration: time, ease: curve('standard') }
    return {
      time,
      layout: { layout: { ...whole, path } },
      letters: {
        ...whole,
        opacity: { delay: time / 4, duration: time / 2, ease: 'linear' as const },
      },
    }
  })
  const letters = flight.letters!
  const flyer = useRef<HTMLSpanElement>(null)

  // The browser mixes the surface, since it knows every colour it gives.
  useLayoutEffect(() => {
    const changes = flyer.current!.animate(flight.surfaces!, {
      duration: move.time * 1000,
      easing: `cubic-bezier(${curve('standard')})`,
    })
    return () => changes.cancel()
  }, [flight.surfaces, move])

  // A flight that Motion does not end, as between two places that share a box, ends by itself.
  useEffect(() => {
    const late = setTimeout(() => land(id), move.time * 2000)
    return () => clearTimeout(late)
  }, [id, move])

  return (
    <m.span
      {...props.look}
      aria-hidden
      data-travels="flies"
      layoutId={id}
      // It stays for the frame that shows it landed.
      onLayoutAnimationComplete={() => requestAnimationFrame(() => land(id))}
      popover="manual"
      ref={(element) => {
        flyer.current = element
        element?.togglePopover(true)
      }}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      transition={move.layout}
    >
      {/* Each keeps the middle of the box while the box changes, and its letters go from one size to the other. */}
      <m.span
        animate={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 1 / letters }}
        layout
        layoutAnchor={centre}
        transition={move.letters}
      >
        {props.children}
      </m.span>
      <m.span
        animate={{ opacity: 0, scale: letters }}
        data-travels="was"
        initial={{ opacity: 1, scale: 1 }}
        layout
        layoutAnchor={centre}
        transition={move.letters}
      >
        {flight.was}
      </m.span>
    </m.span>
  )
}

// One place of a thing that travels: the place it leaves, or with `lands` the place it lands in. Both go by one id,
// and `travel` sends the thing from the first to the second.
export function Travels({
  id,
  lands,
  children,
  ...look
}: Look & { id: string; lands?: boolean; children?: ReactNode }) {
  const flight = useSyncExternalStore(
    watch,
    () => flights.get(id),
    () => undefined,
  )
  const place = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // The flyer carries the surface, so what it was comes without one.
    const was = (
      <span {...look} style={{ background: 'none', boxShadow: 'none' }}>
        {children}
      </span>
    )
    if (!lands) leaving.set(id, { was, place: place.current! })
  })
  useEffect(() => {
    if (lands) {
      landing.set(id, place.current!)
      return () => void landing.delete(id)
    }
    return () => {
      leaving.delete(id)
      const flight = flights.get(id)
      if (flight) set(id, flight.box && !flight.landed ? { ...flight, gone: true } : undefined)
    }
  }, [id, lands])

  if (!lands)
    return flight ? (
      // The place it left keeps its room.
      <span {...look} data-travels={flight.box ? 'left' : 'out'} ref={place}>
        {children}
      </span>
    ) : (
      // Nothing but leaving moves it: its box is taken as it goes.
      <m.span {...look} layoutDependency={0} layoutId={id} ref={place}>
        {children}
      </m.span>
    )

  const flying = flight?.box && !flight.landed
  return (
    <>
      <span
        {...look}
        data-travels={flying ? 'awaited' : flight && !flight.box ? 'in' : undefined}
        ref={place}
      >
        {children}
      </span>
      {flying && (
        <Flyer flight={flight} id={id} look={look}>
          {children}
        </Flyer>
      )}
    </>
  )
}

// The box an element is drawn as where something travels from it or to it, as the tile of an app is for the app, when it
// is on screen.
function boxOf(element?: Element | null) {
  const box = (element?.querySelector('[data-travels-from]') ?? element)?.getBoundingClientRect()
  const seen =
    box &&
    box.width &&
    box.bottom > 0 &&
    box.right > 0 &&
    box.top < innerHeight &&
    box.left < innerWidth
  return seen ? box : null
}

// A box at the size a part opens from, about the same middle.
const shrunk = ({ x, y, width, height }: DOMRect, by = start()) =>
  new DOMRect(x + (width * (1 - by)) / 2, y + (height * (1 - by)) / 2, width * by, height * by)

const ms = (name: Parameters<typeof duration>[0]) => duration(name) * 1000

// A box that travels over the place it belongs to, in from the element it leaves or out back to it, so one element is
// seen to go; stopped, it stays where it is for the next move to set off from, or with `clear` goes back to its place.
export function carry(
  box: HTMLElement,
  place: HTMLElement,
  way: 'in' | 'out',
  other: Element | null | undefined,
  done: () => void,
) {
  const { style } = box
  const coming = way === 'in'
  const clear = () => {
    delete box.dataset.travels
    for (const property of ['position', 'left', 'top', 'width', 'height', '--lands-w', '--lands-h'])
      style.removeProperty(property)
  }
  if (reduced()) {
    const fades = box.animate(
      { opacity: coming ? [0, 1] : [1, 0] },
      { duration: ms('fast'), easing: 'linear', fill: coming ? 'backwards' : 'forwards' },
    )
    fades.onfinish = done
    return () => fades.cancel()
  }

  const time = ms(coming ? 'slow' : 'back')
  const lag = coming ? 0 : ms('lag')
  const fade = ms('fast-exit')
  const ease = cubicBezier(...curve(coming ? 'standard' : 'exit'))
  const there = boxOf(other)
  // One caught on its way turns back from where it is.
  const flying = 'travels' in box.dataset
  const from =
    coming && !flying
      ? (there ?? shrunk(place.getBoundingClientRect()))
      : box.getBoundingClientRect()
  const end = there ?? shrunk(from)
  const fades =
    coming && flying
      ? undefined
      : box.animate(
          { opacity: coming ? [0, 1] : [1, 0] },
          coming
            ? { duration: fade, easing: 'linear', fill: 'backwards' }
            : { duration: fade, delay: lag + time - fade, easing: 'linear', fill: 'forwards' },
        )

  // Coming, it lands where its place is at each moment, which its view can still change.
  function step(share: number) {
    const at = place.getBoundingClientRect()
    const to = coming ? at : end
    const mix = (side: 'x' | 'y' | 'width' | 'height') =>
      from[side] + (to[side] - from[side]) * share
    style.left = `${mix('x') - at.x}px`
    style.top = `${mix('y') - at.y}px`
    style.width = `${mix('width')}px`
    style.height = `${mix('height')}px`
    style.setProperty('--lands-w', `${at.width}px`)
    style.setProperty('--lands-h', `${at.height}px`)
  }

  box.dataset.travels = 'flies'
  style.position = 'absolute'
  step(0)
  let begun = 0
  let frame = requestAnimationFrame(function tick(now) {
    begun ||= now
    const share = Math.min(1, Math.max(0, now - begun - lag) / time)
    step(ease(share))
    // It stays for the frame that shows it landed.
    frame = requestAnimationFrame(
      share < 1
        ? tick
        : () => {
            if (coming) clear()
            else delete box.dataset.travels
            done()
          },
    )
  })
  return (clearing?: boolean) => {
    cancelAnimationFrame(frame)
    fades?.cancel()
    if (clearing) clear()
  }
}

// What comes and goes with a box that travels, as its button in the taskbar: it rises into its bar over slow as the
// box sets off, and sinks out of it in half the time; with reduced motion it fades where it stands.
export const rise = {
  open: () => ({
    opacity: 1,
    y: '0%',
    transition: { duration: duration('slow'), ease: curve('enter') },
  }),
  closed: () => ({
    opacity: 0,
    y: reduced() ? '0%' : '100%',
    transition: { duration: duration('slow-exit'), ease: curve('exit') },
  }),
}
