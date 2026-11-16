'use client'

import { AnimatePresence, useIsPresent } from 'motion/react'
import * as m from 'motion/react-m'
import { catchError } from 'next/error'
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

import type { Dictionary } from '@/i18n/en'

import { Bar, BarGrip, BarText } from '../molecules/Bar'
import { Dots } from '../molecules/Dots'
import { Path } from '../molecules/Path'
import { Tag } from '../molecules/Tag'
import { WindowControls } from '../molecules/WindowControls'
import { aim, ways } from '../motion/Origin'
import { curve, duration, reduced, spring, usePainted } from '../motion/vocabulary'

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
  // One size: no full screen and nothing to pull. Still: nothing moves it either.
  oneSize?: boolean
  still?: boolean
  inert?: boolean
  density?: 'pointer' | 'touch'
  surface?: 'paper'
  // An edge is held, so the size shows; its view is on the way, so dots do.
  sizing?: boolean
  waiting?: boolean
  // What opened it and the id of its taskbar button: it grows out of the one and shrinks into the other.
  opener?: Element | null
  task?: string
  // Opened by the visitor just now: it takes the focus at its heading.
  takesFocus?: boolean
  // What its body holds, by name, and the way that went: what replaces it comes from there.
  content?: string
  travel?: 'forward' | 'back'
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

// Follows the pointer from a press to its release, on what was pressed.
function follow(
  event: PointerEvent<HTMLElement>,
  to: Record<'move' | 'end', (dx: number, dy: number) => void>,
) {
  const held: HTMLElement = event.currentTarget
  const { clientX, clientY } = event
  const released = new AbortController()
  const listen = (type: 'pointermove' | 'pointerup' | 'pointercancel', then: typeof to.move) =>
    held.addEventListener(type, (now) => then(now.clientX - clientX, now.clientY - clientY), {
      signal: released.signal,
    })

  held.setPointerCapture(event.pointerId)
  let last: [number, number] = [0, 0]
  listen('pointermove', (dx, dy) => {
    last = [dx, dy]
    to.move(dx, dy)
  })
  listen('pointerup', (dx, dy) => {
    released.abort()
    to.end(dx, dy)
  })
  // A pointer the browser takes away leaves the window where it last had it, whatever the cancel says.
  listen('pointercancel', () => {
    released.abort()
    to.end(...last)
  })
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

// Every page is a window, and a window is a frame the visitor handles: its bar holds the controls and its name
// and is its handle, what it can do sits at its foot, and on a desk every edge pulls.
export function Window(props: Props) {
  const { id, title, box, front, full, away = false, opener, task, waiting, t, act, after } = props
  const root = useRef<HTMLElement>(null)
  const origin = useRef<HTMLDivElement>(null)
  const size = useRef<HTMLSpanElement>(null)
  const painted = usePainted()
  const present = useIsPresent()
  const [gone, setGone] = useState(away)
  // It is back in the page before it sets out from the taskbar again.
  if (!away && gone) setGone(false)
  // The fade is named only once the frame has turned: named from the start, it would play as Motion arrives.
  const [turn, setTurn] = useState<[boolean?, ('float' | 'full')?]>([full])
  if (turn[0] !== full) setTurn([full, full ? 'full' : 'float'])

  const placed = !!box && 'x' in box
  const handled = !!act && !!after && placed && !full && !props.still
  const sized = handled && !props.oneSize
  // Chrome follows the device unless a density is asked for: compact under a pointer, regular under a finger.
  const chrome = props.density === 'pointer' ? 'compact' : props.density ? undefined : 'chrome'
  const wasAway = useRef(away)
  const focused = useRef(false)

  // It shrinks into its taskbar button and grows back out of it; opening and closing are its opener's.
  useLayoutEffect(() => {
    if (origin.current?.offsetWidth) {
      aim(origin.current, away || wasAway.current ? byId(task) : opener)
    }
    wasAway.current = away
  }, [away, present, opener, task])

  // It takes the focus at its heading, or itself until its view brings one.
  useEffect(() => {
    const self = root.current!
    if (!props.takesFocus || (focused.current && document.activeElement !== self)) return
    focused.current = true
    const heading = self.querySelector<HTMLElement>('.window__body :is(h1, h2)')
    if (heading) heading.tabIndex = -1
    ;(heading ?? self).focus()
  }, [props.takesFocus, waiting])

  // The server has no tokens to read, and what it painted stays as it is.
  const frames = useMemo(() => {
    if (painted) return
    return {
      ...ways('slow', () => opener),
      // A move the visitor can interrupt, so it opens on the spring.
      open: () => ({ opacity: 1, scale: 1, transition: spring('slow') }),
      away: () => ({
        ...ways('slow', () => byId(task)).closed(),
        transition: { duration: duration('slow'), ease: curve('standard') },
      }),
    }
  }, [painted, opener, task])
  const travels = useMemo(
    () =>
      painted ? undefined : { layout: { duration: duration('slow'), ease: curve('standard') } },
    [painted],
  )
  // What replaces a view comes one step from where the visitor is heading, while the old one fades.
  const views = useMemo(() => {
    if (painted) return
    const step = () => parseFloat(getComputedStyle(origin.current!).getPropertyValue('--s-6'))
    return {
      from: (travel?: 'forward' | 'back') => ({
        opacity: 0,
        x: !travel || reduced() ? 0 : travel === 'back' ? -step() : step(),
      }),
      in: () => ({
        opacity: 1,
        x: 0,
        transition: { duration: duration('slow'), ease: curve('enter') },
      }),
      out: () => ({
        opacity: 0,
        transition: { duration: duration('slow-exit'), ease: curve('exit') },
      }),
    }
  }, [painted])

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
      data-front={front && present ? '' : undefined}
      data-full={full ? '' : undefined}
      data-placed={placed ? '' : undefined}
      data-still={props.still ? '' : undefined}
      hidden={gone}
      id={id}
      inert={away || !present || props.inert}
      onFocus={(event) => !control(event) && act?.({ type: 'focus' })}
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
      {/* What opens and closes about a point is apart from the frame, which travels to the desk's size. */}
      <m.div
        animate={away ? 'away' : 'open'}
        className="window__origin"
        exit="closed"
        initial="closed"
        onAnimationComplete={(arrived) => arrived === 'away' && away && setGone(true)}
        ref={origin}
        variants={frames}
      >
        <m.div
          className="window__frame"
          data-surface={props.surface ?? 'window'}
          // It moves and sizes to the desk as one piece, unless motion is reduced.
          layout={!painted && !reduced()}
          layoutDependency={full}
          transition={travels}
        >
          <m.div animate={turn[1]} className="window__content" variants={fades}>
            <Bar
              aria-label={act && t.handle.replace('{window}', title)}
              className="window__bar"
              data-handle={handled ? '' : undefined}
              line="below"
              onDoubleClick={(event) =>
                !(event.target as Element).closest('button, a') && act?.({ type: 'full' })
              }
              onKeyDown={key}
              onPointerDown={grab}
              role={act && 'group'}
              size={chrome}
              tabIndex={act && !props.still ? 0 : undefined}
            >
              {controls('dots')}
              <BarText>
                <Path segments={props.name} />
              </BarText>
              <BarGrip />
              {controls('squares')}
            </Bar>
            {props.toolbar}
            <div className="window__body cq">
              <AnimatePresence custom={props.travel} initial={false} mode="popLayout">
                <m.div
                  animate="in"
                  className="window__view"
                  custom={props.travel}
                  exit="out"
                  initial="from"
                  key={waiting ? '' : (props.content ?? 'view')}
                  variants={views}
                >
                  {waiting ? (
                    <Waiting label={t.waiting} />
                  ) : (
                    <Caught text={t.failed}>{props.children}</Caught>
                  )}
                </m.div>
              </AnimatePresence>
            </div>
            {props.foot}
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
