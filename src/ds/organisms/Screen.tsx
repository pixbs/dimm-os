'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

import type { IconName } from '../atoms/Icon'
import { App } from '../molecules/App'
import { Bar, BarSpace } from '../molecules/Bar'
import { Button, ButtonLink } from '../molecules/Button'
import { rise, settle } from '../motion/Travels'
import { usePainted } from '../motion/vocabulary'
import { arrange, arrows, type Cell, type Cells, settles, stepped } from './cells'
import { Wallpaper } from './Wallpaper'

export type Tile = 'raised' | 'paper' | 'orange' | 'blue' | 'mint'

// The whole display: the wallpaper behind everything, and the bars and the desk in front of it. It is a desk
// from 600 px wide and a phone below; filling the browser's window, that is the window's width.
export function Screen({
  fill,
  waiting,
  wallpaper = true,
  className,
  children,
  ...rest
}: ComponentProps<'div'> & {
  fill?: boolean
  // A screen that waits (starting up, locked, shut down) stands over the desk until it hands over.
  waiting?: boolean
  // Its wallpaper is drawn once it arrives. A screen that waits draws none: it shows the desk's, which goes on as the
  // desk takes over, or covers it.
  wallpaper?: boolean
}) {
  return (
    <div
      {...rest}
      className={className ? `screen ${className}` : 'screen'}
      data-fill={fill ? '' : undefined}
      data-surface="desktop"
      data-waiting={waiting ? (wallpaper ? 'clear' : 'covers') : undefined}
    >
      {wallpaper && !waiting && <Wallpaper />}
      {children}
    </div>
  )
}

// The first stop of the keyboard skips to the window in front; with script it leaves the address alone.
export function Skip({ to, label }: { to: string; label: string }) {
  return (
    <div className="screen__skip" data-surface="inverted">
      <ButtonLink
        href={`#${to}`}
        label={label}
        onClick={(event) => {
          event.preventDefault()
          document.getElementById(to)?.focus()
        }}
      />
    </div>
  )
}

export type Shortcut = {
  href: string
  name: string
  icon: IconName
  tile: Tile | null
  lang?: string
  // The address of the file it offers, which makes it a file on the desk.
  file?: string
  // Shown on one kind of screen only.
  screen?: 'phone' | 'desk'
}

// The grid of a desk as CSS lays it out: how many cells fit, and how far apart they stand.
function measure(nav: HTMLElement) {
  const style = getComputedStyle(nav)
  const across = parseFloat(style.gridTemplateColumns) + parseFloat(style.columnGap)
  const down = parseFloat(style.gridTemplateRows) + parseFloat(style.rowGap)
  const fit = (room: number, step: number, gap: number) =>
    Math.max(1, Math.floor((room + gap) / step))
  return {
    cols: fit(nav.clientWidth, across, parseFloat(style.columnGap)),
    rows: fit(nav.clientHeight, down, parseFloat(style.rowGap)),
    across,
    down,
  }
}

// The apps the admin has defined, on the desk: a column, four across, or the one the screen's width asks for. On a
// desk they stand in cells, and where it can be moved an app is carried to another by a press that strays, or by
// Shift and an arrow.
export function Apps(props: {
  apps: Shortcut[]
  layout: 'column' | 'grid' | 'screen'
  label?: string
  // Covered by a window in full screen, they cannot be reached.
  inert?: boolean
  // Where each stands once one has been moved; without, as at the start.
  cells?: Cells | null
  onPlace?: (cells: Cells) => void
  // The level a carried app lies at, over everything else on the desk.
  above?: number
}) {
  const { onPlace } = props
  const nav = useRef<HTMLElement>(null)
  const [grid, setGrid] = useState<ReturnType<typeof measure> | null>(null)
  const [carried, setCarried] = useState<{ app: string; spot: Cell } | null>(null)
  const order = props.apps.filter((app) => app.screen !== 'phone').map((app) => app.href)
  const cells = grid && arrange(order, props.cells ?? null, grid)
  // Until one moves they stand as CSS puts them, which is where they start.
  const shown = props.cells || carried ? (cells ?? props.cells) : null

  // The screen's own grid is measured whenever it changes, so moved apps keep to the desk.
  const screen = props.layout === 'screen'
  useEffect(() => {
    if (!screen) return
    const element = nav.current!
    const sized = new ResizeObserver(() => setGrid(measure(element)))
    sized.observe(element)
    return () => sized.disconnect()
  }, [screen])

  // Moved, it settles into its cell from where it was let go.
  function place(element: HTMLElement, app: string, cell: Cell) {
    settle(element, () =>
      flushSync(() => {
        setCarried(null)
        onPlace!({ ...cells!, [app]: cell })
      }),
    )
  }

  // A press that strays past the reach picks the app up, and it follows the pointer; one that does not opens it.
  function press(event: PointerEvent<HTMLElement>) {
    const element = (event.target as Element).closest<HTMLElement>('.app')
    if (!onPlace || !cells || !element || event.button !== 0 || event.pointerType === 'touch')
      return
    const app = element.getAttribute('href')!
    const { clientX, clientY, pointerId } = event
    const reach = parseFloat(getComputedStyle(element).getPropertyValue('--s-1'))
    const [col, row] = cells[app]
    let spot: Cell | null = null
    const released = new AbortController()
    const listen = (
      type: 'pointermove' | 'pointerup' | 'pointercancel',
      then: (event: globalThis.PointerEvent) => void,
    ) =>
      addEventListener(type, (event) => event.pointerId === pointerId && then(event), {
        signal: released.signal,
      })
    const over = (dx: number, dy: number): Cell => [
      Math.round((col * grid!.across + dx) / grid!.across),
      Math.round((row * grid!.down + dy) / grid!.down),
    ]
    listen('pointermove', ({ clientX: x, clientY: y }) => {
      const [dx, dy] = [x - clientX, y - clientY]
      if (!spot && Math.hypot(dx, dy) <= reach) return
      if (!spot) {
        element.setPointerCapture(pointerId)
        getSelection()?.removeAllRanges()
      }
      element.style.transform = `translate(${dx}px, ${dy}px)`
      const next = settles(app, over(dx, dy), cells, grid!)
      if (next[0] !== spot?.[0] || next[1] !== spot?.[1]) setCarried({ app, spot: (spot = next) })
    })
    const end = () => {
      released.abort()
      if (!spot) return
      // The press that carried it is not a press on it.
      addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => removeEventListener('click', swallow, true))
      place(element, app, spot)
    }
    listen('pointerup', end)
    listen('pointercancel', end)
  }

  // Shift and an arrow move the app that has the focus a cell, over those taken.
  function key(event: KeyboardEvent<HTMLElement>) {
    const element = (event.target as Element).closest<HTMLElement>('.app')
    const to = arrows[event.key]
    if (!onPlace || !cells || !element || !to || !event.shiftKey || event.altKey) return
    if (event.metaKey || event.ctrlKey) return
    event.preventDefault()
    const app = element.getAttribute('href')!
    place(element, app, stepped(app, to, cells, grid!))
  }

  const at = (cell?: Cell) =>
    cell && ({ '--col': cell[0] + 1, '--row': cell[1] + 1 } as CSSProperties)

  return (
    <nav
      aria-label={props.label}
      className="apps"
      data-layout={props.layout}
      data-moves={onPlace ? '' : undefined}
      inert={props.inert}
      onDragStart={onPlace && ((event) => event.preventDefault())}
      onKeyDown={onPlace && key}
      onPointerDown={onPlace && press}
      ref={nav}
    >
      {props.apps.map(({ tile, file: _, ...app }) => {
        const lifted = carried?.app === app.href && app.screen !== 'phone'
        return (
          <App
            key={`${app.screen}${app.href}`}
            {...app}
            state={lifted ? 'carried' : undefined}
            style={{
              ...at(app.screen === 'phone' ? undefined : shown?.[app.href]),
              zIndex: lifted ? props.above : undefined,
            }}
            tile={tile ?? undefined}
          />
        )
      })}
      {carried && <span aria-hidden className="apps__spot" style={at(carried.spot)} />}
    </nav>
  )
}

// A click the page should not take.
function swallow(event: Event) {
  event.preventDefault()
  event.stopPropagation()
}

// A window as the taskbar shows it: the window in front is selected, one minimised has a hollow mark.
export type Task = {
  // The id of its button, which its window travels to and back from.
  id?: string
  name: string
  tile?: Tile | null
  front?: boolean
  minimised?: boolean
  // It waits for an answer where it cannot be seen: the signal dot.
  signal?: boolean
}

const TaskButton = m.create(Button)

// One button per window, led by the mark of its app: it rises into its bar as its window sets off, and leaves it as
// its window closes.
function Tasks(props: {
  tasks: Task[]
  size?: 'compact' | 'chrome'
  onPick?: (index: number, button: HTMLElement) => void
}) {
  const painted = usePainted()

  return (
    <AnimatePresence initial={false}>
      {props.tasks.map((task, index) => (
        <TaskButton
          animate="open"
          aria-current={task.front || undefined}
          exit="closed"
          id={task.id}
          initial="closed"
          key={task.id ?? index}
          label={task.name}
          lead={
            <>
              <span
                className="mark"
                data-surface={task.tile ?? undefined}
                data-tone={task.minimised ? 'off' : undefined}
              />
              {task.signal && <span className="dot" data-tone="signal" />}
            </>
          }
          onClick={props.onPick && ((event) => props.onPick!(index, event.currentTarget))}
          size={props.size}
          tone={task.front ? 'solid' : undefined}
          variants={painted ? undefined : rise}
        />
      ))}
    </AnimatePresence>
  )
}

// The foot of a desk: one button per window, and the tray at its end.
export function Taskbar(props: {
  tasks: Task[]
  size?: 'compact' | 'chrome'
  onPick?: (index: number, button: HTMLElement) => void
  children?: ReactNode
}) {
  return (
    <Bar line="above">
      <Tasks onPick={props.onPick} size={props.size} tasks={props.tasks} />
      <BarSpace />
      {props.children}
    </Bar>
  )
}
