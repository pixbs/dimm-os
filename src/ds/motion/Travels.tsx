'use client'

import { cubicBezier, type MotionPath } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { curve, duration, reduced } from './vocabulary'

// How a place looks: its class and what it tells CSS.
type Look = { className?: string; 'aria-hidden'?: boolean } & {
  [data: `data-${string}`]: string | undefined
}

type Flight = {
  // The thing as it stood where it left.
  was: ReactNode
  // Where it lands in the browser's window; without one nothing flies, and it fades.
  box?: DOMRect
  landed?: boolean
  // The place it left has gone meanwhile, so nothing of the flight is kept once it has landed.
  gone?: boolean
}

const leaving = new Map<string, ReactNode>()
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
  const was = leaving.get(id)
  const to = landing.get(id)
  if (was === undefined || !to || flights.has(id)) return
  const box = to.getBoundingClientRect()
  set(id, { was, box: !reduced() && 'showPopover' in to && box.width ? box : undefined })
}

function land(id: string) {
  const flight = flights.get(id)
  if (flight) set(id, flight.gone ? undefined : { ...flight, landed: true })
}

const centre = { x: 0.5, y: 0.5 }

// The one element that travels. It stands in the top layer, over every screen, as the place it lands in, and Motion
// carries it there from the box of the element that left under its id: place and size as one box, across on one
// curve and up on another. What it was lies over what it becomes, cut to that box, and fades into it during the
// middle half of the move.
function Flyer(props: { id: string; flight: Flight; look: Look; children: ReactNode }) {
  const { id, flight } = props
  const box = flight.box!
  const [move] = useState(() => {
    const [x1, y1, x2, y2] = curve('across')
    // Motion eases the whole move on the curve across; the way up is read off its own curve at the same moment.
    const moment = cubicBezier(y1, x1, y2, x2)
    const up = cubicBezier(...curve('up'))
    const path: MotionPath = {
      interpolateProjection:
        ({ x, y }) =>
        (across) => ({
          x: x.translate * (1 - across),
          y: y.translate * (1 - up(moment(across))),
        }),
    }
    const time = duration('travel')
    return {
      time,
      layout: { layout: { duration: time, ease: curve('across'), path } },
      middle: { delay: time / 4, duration: time / 2, ease: 'linear' as const },
    }
  })

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
      ref={(flyer) => void flyer?.togglePopover(true)}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      transition={move.layout}
    >
      {/* Each keeps its own size and the middle of the box while the box changes. */}
      <m.span
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        layout
        layoutAnchor={centre}
        transition={move.middle}
      >
        {props.children}
      </m.span>
      <m.span
        animate={{ opacity: 0 }}
        data-travels="was"
        layout
        layoutAnchor={centre}
        transition={move.middle}
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
    if (!lands) leaving.set(id, <span {...look}>{children}</span>)
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
      <span {...look} data-travels={flight.box ? 'left' : 'out'}>
        {children}
      </span>
    ) : (
      // Nothing but leaving moves it: its box is taken as it goes.
      <m.span {...look} layoutDependency={0} layoutId={id}>
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
