'use client'

import { AnimatePresence, useMotionValue, usePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { catchError } from 'next/error'
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

import type { Dictionary } from '@/i18n/en'

import { Bar, BarHandle, BarText } from '../molecules/Bar'
import { Dots } from '../molecules/Dots'
import { Path } from '../molecules/Path'
import { Tag } from '../molecules/Tag'
import { WindowControls } from '../molecules/WindowControls'
import { useArrival } from '../motion/enters'
import { carry } from '../motion/Travels'
import { curve, duration, reduced, spring, usePainted } from '../motion/vocabulary'
import { Handle, rises, trap } from './Drawer'
import { follow } from './follow'

export type Box = { x: number; y: number; w: number; h: number }
export type Edge = 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se'

type Move = { type: 'move'; dx: number; dy: number }
type Pull = { type: 'pull'; edge: Edge; dx: number; dy: number }

// What a visitor does to a window: the manager of its desk answers each.
type Handled =
  | { type: 'focus' | 'close' | 'minimise' | 'full' | 'hold' }
  | { type: 'step'; x: number; y: number; pull: boolean }
  | Move
  | Pull

type Props = {
  id?: string
  // What its bar calls it, as a path, and what assistive technology calls it.
  name: string[]
  title: string
  front?: boolean
  full?: boolean
  // Put away in the taskbar: it leaves the page once it has arrived there.
  away?: boolean
  // Its size, and on a desk its place once the desk is measured.
  box?: Box | Pick<Box, 'w' | 'h'>
  level?: number
  // On a phone it is a drawer: how many drawers stand in front of it.
  back?: number
  // One size: no full screen and nothing to pull. Still: nothing moves it either.
  oneSize?: boolean
  still?: boolean
  inert?: boolean
  density?: 'pointer' | 'touch'
  surface?: 'paper'
  // An edge is held, so the size shows; its view is on the way, so dots do.
  sizing?: boolean
  waiting?: boolean
  // What opened it and the id of its taskbar button: it travels from the one, back to it, and to the other.
  opener?: Element | null
  task?: string
  // Opened by the visitor just now: it takes the focus at its heading.
  takesFocus?: boolean
  // What its body holds, by name.
  content?: string
  toolbar?: ReactNode
  foot?: ReactNode
  status?: ReactNode
  t: Pick<
    Dictionary,
    'close' | 'minimise' | 'fullScreen' | 'window' | 'handle' | 'waiting' | 'failed'
  >
  act?: (action: Handled) => void
  // The box a move or a pull would leave it with: the frame draws it while the pointer is down.
  after?: (gesture: Move | Pull) => Box
  children?: ReactNode
}

const edges = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw'] as const
const byId = (id?: string) => (id ? document.getElementById(id) : null)
const arrows: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

// A press on a control of a window behind does what the control says without bringing it forward, so closing it
// leaves the address alone; the keyboard reaching a control brings its window forward as any focus does.
const control = (event: { target: EventTarget }) => {
  const at = event.target as Element
  return !!at.closest('.wctl') && !at.matches(':focus-visible')
}

// To full screen and back the frame travels on its own: what it holds fades out, and back in at the new width.
function fade() {
  const slow = duration('slow')
  return {
    opacity: [1, 0, 0, 1],
    transition: {
      duration: slow,
      times: [0, duration('fast-exit') / slow, 1 - duration('fast') / slow, 1],
      ease: [curve('exit'), 'linear' as const, curve('enter')],
    },
  }
}
const fades = { float: fade, full: fade }

// A view that fails to render leaves its frame, and every other window, standing.
const Caught = catchError((props: { text: string }) => <p className="window__says">{props.text}</p>)

// A window whose view is on the way says so only after a moment, in dots that count.
function Waiting({ label }: { label: string }) {
  const [on, setOn] = useState(0)

  useEffect(() => {
    let timer = setTimeout(
      function count() {
        setOn((on) => (on % 3) + 1)
        timer = setTimeout(count, duration('slow') * 1000)
      },
      duration('wait') * 1000,
    )
    return () => clearTimeout(timer)
  }, [])

  return (
    <p className="window__says" role="status">
      {on > 0 && <Dots count={3} label={label} on={on} />}
    </p>
  )
}

// What a window holds arrives once the window has opened, after what it replaces has left.
function View(props: ComponentProps<typeof m.div> & { open: boolean; replaces: boolean }) {
  const { open, replaces, ...rest } = props
  return <m.div {...rest} ref={useArrival(open, replaces)} />
}

// Every page is a window, and a window is a frame the visitor handles: its bar holds the controls and its name
// and is its handle, what it can do sits at its foot, and on a desk every edge pulls. On a phone it is a drawer.
export function Window(props: Props) {
  const { id, title, box, front, full, away = false, opener, task, waiting, t, act, after } = props
  const root = useRef<HTMLElement>(null)
  const origin = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  // How far down a drawer is, and how fast it was let go.
  const y = useMotionValue('0%')
  const flung = useRef(0)
  const [kept, setKept] = useState(false)
  const size = useRef<HTMLSpanElement>(null)
  const painted = usePainted()
  // Whether it has opened, so what it holds can arrive; what the server painted is open.
  const [opened, setOpened] = useState(painted)
  const [present, removed] = usePresence()
  const [gone, setGone] = useState(away)
  // It is back in the page before it sets out from the taskbar again.
  if (!away && gone) setGone(false)
  // The fade is named only once the frame has turned: named from the start, it would play as Motion arrives.
  const [turn, setTurn] = useState<[boolean?, ('float' | 'full')?]>([full])
  if (turn[0] !== full) setTurn([full, full ? 'full' : 'float'])

  const placed = !!box && 'x' in box
  const drawer = props.back !== undefined
  // On a desk it is one box that travels, in as it opens or comes back from the taskbar, out as it is put away or
  // closed; a drawer rises and leaves as it does, and what the server painted is there already.
  const leaving = away || !present
  const [travel, setTravel] = useState<'in' | 'out' | undefined>(
    painted || drawer ? undefined : 'in',
  )
  if (!drawer && leaving && travel !== 'out') setTravel('out')
  if (!drawer && !leaving && travel === 'out') setTravel('in')
  const modal = drawer && !!act
  const handled = !!act && !!after && placed && !full && !props.still
  const sized = handled && !props.oneSize
  // Chrome follows the device unless a density is asked for: compact under a pointer, regular under a finger.
  const chrome = props.density === 'pointer' ? 'compact' : props.density ? undefined : 'chrome'
  const focused = useRef(false)

  // It goes to its taskbar button and comes back from it; opening and closing are its opener's.
  const stop = useRef<(clear?: boolean) => void>(undefined)
  const wasAway = useRef(false)
  // What it closes back to: what opened it, which its taskbar button does not become by bringing it back.
  const home = useRef(opener)
  useEffect(() => {
    if (opener?.id !== task) home.current = opener
  }, [opener, task])
  const travelled = useEffectEvent((way: 'in' | 'out') => {
    const fromTask = way === 'in' ? wasAway.current : away
    wasAway.current = away
    // One remembered in the taskbar is hidden from the start, with nowhere to travel from.
    if (root.current!.hidden) return
    const back = opener?.id === task ? home.current : opener
    return carry(frame.current!, root.current!, way, fromTask ? byId(task) : back, () => {
      if (way === 'in') return setOpened(true)
      if (!away) return removed?.()
      // Hidden before it goes back to its place.
      flushSync(() => setGone(true))
      stop.current?.(true)
    })
  })
  // Before paint, so its first frame stands on what it leaves.
  useLayoutEffect(() => {
    // One that became a drawer on its way is set down in its place.
    if (!travel || drawer) return stop.current?.(true)
    stop.current = travelled(travel)
    return () => stop.current?.()
  }, [travel, drawer])
  // A drawer leaves as it does, and one put away already has nowhere to travel as it is closed.
  useEffect(() => {
    if (!present && (drawer || gone)) removed?.()
  }, [present, drawer, gone, removed])

  // It takes the focus at its heading, or itself until its view brings one, where it stands: a drawer on its way
  // up is still below the screen.
  const view = waiting ? '' : (props.content ?? 'view')
  function enter() {
    const self = root.current!
    const heading = self.querySelector<HTMLElement>(
      `.window__view[data-view="${CSS.escape(view)}"] :is(h1, h2)`,
    )
    if (heading) heading.tabIndex = -1
    ;(heading ?? self).focus({ preventScroll: true })
  }
  const takeFocus = useEffectEvent(() => {
    if (!props.takesFocus || (focused.current && document.activeElement !== root.current)) return
    focused.current = true
    enter()
  })
  useEffect(() => takeFocus(), [props.takesFocus, waiting])
  // A view that replaces another takes the focus the one before held, which leaves with it.
  const replaced = useEffectEvent(() => {
    const at = document.activeElement
    if (at === document.body || root.current!.contains(at)) enter()
  })
  const viewed = useRef(view)
  useEffect(() => {
    if (viewed.current !== view && viewed.current) replaced()
    viewed.current = view
  }, [view])
  // A drawer is modal: whenever it comes up in front, the focus moves in; one that opened without the visitor, as
  // the page's own or one that opens at start, waits for them.
  const comeUp = useEffectEvent(() => {
    if (modal && front && !away && !root.current!.contains(document.activeElement)) enter()
  })
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) comeUp()
    mounted.current = true
  }, [front, away])

  // The server has no tokens to read, and what it painted stays as it is.
  const frames = useMemo(() => {
    if (painted) return
    if (drawer) return rises()
  }, [painted, drawer])
  // A drawer behind steps back on the spring as the one in front rises.
  const travels = useMemo(() => {
    if (painted) return
    return {
      layout: drawer ? spring('slow') : { duration: duration('slow'), ease: curve('standard') },
    }
  }, [painted, drawer])
  const scrim = useMemo(() => {
    if (painted) return
    const fades = (opacity: number) => () => ({
      opacity,
      transition: { duration: duration('slow'), ease: curve('standard') },
    })
    return { open: fades(1), kept: fades(1), closed: fades(0), away: fades(0) }
  }, [painted])
  // A view that is replaced leaves first, all of it together.
  const views = useMemo(() => {
    if (painted) return
    return {
      out: () => ({
        opacity: 0,
        transition: { duration: duration('fast-exit'), ease: curve('exit') },
      }),
    }
  }, [painted])
  // The view it opened with arrives as it opens; every later one replaces another.
  const [first] = useState(view)

  // Dragging writes the transform and tells the manager once, on release.
  function grab(event: PointerEvent<HTMLElement>) {
    if (!handled || event.button !== 0 || (event.target as Element).closest('button, a')) return
    const { style } = root.current!
    follow(event, {
      move: (dx, dy) => {
        const to = after({ type: 'move', dx, dy })
        style.transform = `translate(${to.x}px, ${to.y}px)`
      },
      end: (dx, dy) => {
        flushSync(() => act({ type: 'move', dx, dy }))
        style.transform = ''
      },
    })
  }

  // Pulling an edge gives the window its real size, once a frame at most, so its content answers to it.
  const pull = (edge: Edge) => (event: PointerEvent<HTMLElement>) => {
    if (!sized || event.button !== 0) return
    const { style } = root.current!
    let last = [0, 0]
    let queued = 0
    const draw = () => {
      queued = 0
      const to = after({ type: 'pull', edge, dx: last[0], dy: last[1] })
      style.transform = `translate(${to.x}px, ${to.y}px)`
      style.width = `${to.w}px`
      style.height = `${to.h}px`
      if (size.current) size.current.textContent = `${to.w} × ${to.h}`
    }
    act({ type: 'hold' })
    follow(event, {
      move: (dx, dy) => {
        last = [dx, dy]
        queued ||= requestAnimationFrame(draw)
      },
      end: (dx, dy) => {
        cancelAnimationFrame(queued)
        flushSync(() => act({ type: 'pull', edge, dx, dy }))
        style.transform = style.width = style.height = ''
      },
    })
  }

  // With the bar in focus the arrows move the window, Shift with them resizes it, and Enter is full screen.
  function key(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    const to = arrows[event.key]
    if (event.key === 'Enter') act?.({ type: 'full' })
    else if (to && handled) act({ type: 'step', x: to[0], y: to[1], pull: event.shiftKey })
    else return
    event.preventDefault()
  }

  // A drawer goes away by its handle, its scrim or Esc, and the focus goes back to what opened it.
  function putAway(speed = 0) {
    flung.current = speed
    flushSync(() => act!({ type: 'minimise' }))
    if (opener instanceof HTMLElement) opener.focus({ preventScroll: true })
  }
  const state = away ? 'away' : kept ? 'kept' : 'open'

  const controls = (shape: 'dots' | 'squares') => (
    <WindowControls
      full={full}
      off={props.oneSize ? ['fullScreen'] : undefined}
      on={act && ((control) => act({ type: control === 'fullScreen' ? 'full' : control }))}
      shape={shape}
      size={chrome ?? 'regular'}
      t={t}
    />
  )
  const px = (value: number) => `${value}px`

  return (
    <article
      aria-label={title}
      className="window"
      data-back={props.back || undefined}
      data-travel={drawer ? undefined : travel}
      data-front={front && present ? '' : undefined}
      data-full={full ? '' : undefined}
      data-placed={placed ? '' : undefined}
      data-still={props.still ? '' : undefined}
      hidden={gone}
      id={id}
      inert={away || !present || props.inert}
      onFocus={(event) => !control(event) && act?.({ type: 'focus' })}
      onKeyDown={
        modal
          ? (event) => {
              if (event.key !== 'Escape') return trap(event)
              event.preventDefault()
              putAway()
            }
          : undefined
      }
      onPointerDown={(event) => event.button === 0 && !control(event) && act?.({ type: 'focus' })}
      ref={root}
      style={
        box &&
        ({
          '--w': px(box.w),
          '--h': px(box.h),
          '--x': placed ? px(box.x) : undefined,
          '--y': placed ? px(box.y) : undefined,
          zIndex: props.level,
        } as CSSProperties)
      }
      tabIndex={-1}
    >
      {/* On a phone the scrim lies between a drawer and what is behind it, and a press on it puts the drawer away. */}
      <m.div
        animate={state}
        aria-hidden
        className="window__scrim"
        exit="closed"
        initial="closed"
        onClick={modal ? () => putAway() : undefined}
        variants={scrim}
      />
      {/* What opens and closes about a point is apart from the frame, which travels to the desk's size. */}
      <m.div
        animate={state}
        aria-label={modal ? title : undefined}
        aria-modal={modal || undefined}
        className="window__origin"
        exit="closed"
        initial="closed"
        onAnimationComplete={(arrived) => {
          // On a desk the box that travels says so instead.
          if (!drawer) return
          if (arrived === 'away' && away) setGone(true)
          if (arrived === 'open' || arrived === 'kept') setOpened(true)
        }}
        ref={origin}
        role={modal ? 'dialog' : undefined}
        custom={flung}
        style={{ y }}
        variants={frames}
      >
        <m.div
          className="window__frame"
          data-surface={props.surface ?? 'window'}
          ref={frame}
          // It moves and sizes to the desk as one piece, steps back as a drawer, and takes the size its view
          // brings, unless motion is reduced.
          layout={!painted && !reduced()}
          layoutDependency={`${full} ${props.back} ${waiting}`}
          transition={travels}
        >
          <m.div animate={turn[1]} className="window__content" variants={fades}>
            <Handle
              height={() => origin.current!.offsetHeight}
              label={t.close}
              // A drawer that is only shown, with nothing to put it away, springs back.
              leave={(speed) => (modal ? putAway(speed) : setKept((kept) => !kept))}
              stay={() => setKept((kept) => !kept)}
              y={y}
            />
            <Bar
              aria-label={act && !drawer ? t.handle.replace('{window}', title) : undefined}
              className="window__bar"
              data-handle={handled ? '' : undefined}
              line="below"
              onDoubleClick={(event) =>
                !drawer &&
                !(event.target as Element).closest('button, a') &&
                act?.({ type: 'full' })
              }
              onKeyDown={key}
              onPointerDown={grab}
              role={act && !drawer ? 'group' : undefined}
              size={chrome}
              tabIndex={act && !props.still && !drawer ? 0 : undefined}
            >
              {controls('dots')}
              <BarText>
                <Path segments={props.name} />
              </BarText>
              <BarHandle />
              {controls('squares')}
            </Bar>
            {props.toolbar}
            {/* What scrolls: the body, and with it the foot in a short drawer. */}
            <div className="window__main">
              <div className="window__body cq">
                <AnimatePresence initial={false} mode="popLayout">
                  <View
                    className="window__view"
                    data-view={view}
                    exit="out"
                    key={view}
                    open={opened}
                    replaces={view !== first}
                    variants={views}
                  >
                    {waiting ? (
                      <Waiting label={t.waiting} />
                    ) : (
                      <Caught text={t.failed}>{props.children}</Caught>
                    )}
                  </View>
                </AnimatePresence>
              </div>
              {props.foot}
            </div>
            {props.status}
          </m.div>
          {!props.oneSize && !props.still && !full && (
            <>
              {sized &&
                edges.map((edge) => (
                  <span
                    aria-hidden
                    className="window__edge"
                    data-edge={edge}
                    key={edge}
                    onPointerDown={pull(edge)}
                  />
                ))}
              <span aria-hidden className="window__grip dotted" onPointerDown={pull('se')} />
            </>
          )}
          {props.sizing && box && (
            <span className="window__size">
              <Tag surface="inverted">
                <span ref={size}>{`${box.w} × ${box.h}`}</span>
              </Tag>
            </span>
          )}
        </m.div>
      </m.div>
    </article>
  )
}
