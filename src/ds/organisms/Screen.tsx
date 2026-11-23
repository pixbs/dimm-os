'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
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
import { fade, rise, settle } from '../motion/Travels'
import { usePainted } from '../motion/vocabulary'
import { arrange, arrows, type Cell, type Cells, settles, stepped, steppedTogether } from './cells'
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
// Shift and an arrow; where they can be selected, a drag over the empty desk selects those it touches, and the
// selected move together.
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
  // The apps selected, by address, and how the selection changes.
  selected?: string[]
  onSelect?: (apps: string[]) => void
}) {
  const { onPlace, onSelect } = props
  const selected = props.selected ?? []
  const nav = useRef<HTMLElement>(null)
  const boxed = useRef<HTMLSpanElement>(null)
  const [grid, setGrid] = useState<ReturnType<typeof measure> | null>(null)
  // The cell each carried app would settle into.
  const [carried, setCarried] = useState<Cells | null>(null)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
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

  // The apps of the desk as drawn, by their addresses.
  const drawn = (of?: string[]) =>
    [...nav.current!.querySelectorAll<HTMLElement>('.app:not([data-for="phone"])')].filter(
      (element) => !of || of.includes(element.getAttribute('href')!),
    )

  // Moved, they settle into their cells from where they were let go.
  function place(elements: HTMLElement[], moved: Cells) {
    settle(elements, () =>
      flushSync(() => {
        setCarried(null)
        onPlace!({ ...cells!, ...moved })
      }),
    )
  }

  // Following a pointer until it is lifted.
  function follow(
    pointerId: number,
    move: (event: globalThis.PointerEvent) => void,
    end: () => void,
  ) {
    const released = new AbortController()
    const listen = (
      type: 'pointermove' | 'pointerup' | 'pointercancel',
      then: (event: globalThis.PointerEvent) => void,
    ) =>
      addEventListener(type, (event) => event.pointerId === pointerId && then(event), {
        signal: released.signal,
      })
    listen('pointermove', move)
    const done = () => {
      released.abort()
      end()
    }
    listen('pointerup', done)
    listen('pointercancel', done)
  }

  // A press that strays past the reach picks the app up, with the others selected, and they follow the pointer; one
  // that does not opens it. A drag over the empty desk draws the box that selects.
  function press(event: PointerEvent<HTMLElement>) {
    if (!onPlace || !cells || event.button !== 0 || event.pointerType === 'touch') return
    const element = (event.target as Element).closest<HTMLElement>('.app')
    if (!element) {
      if (onSelect && event.target === event.currentTarget) draw(event)
      return
    }
    if (toggles(event)) return
    const app = element.getAttribute('href')!
    const ours = selected.includes(app)
    if (!ours && selected.length) onSelect?.([])
    const group = ours ? [app, ...selected.filter((one) => one !== app)] : [app]
    const elements = drawn(group)
    const { clientX, clientY, pointerId } = event
    const reach = parseFloat(getComputedStyle(element).getPropertyValue('--s-1'))
    let spots: Cells | null = null
    const over = (dx: number, dy: number): Cells =>
      Object.fromEntries(
        group.map((one) => [
          one,
          [
            Math.round((cells[one][0] * grid!.across + dx) / grid!.across),
            Math.round((cells[one][1] * grid!.down + dy) / grid!.down),
          ],
        ]),
      )
    follow(
      pointerId,
      ({ clientX: x, clientY: y }) => {
        const [dx, dy] = [x - clientX, y - clientY]
        if (!spots && Math.hypot(dx, dy) <= reach) return
        if (!spots) {
          element.setPointerCapture(pointerId)
          getSelection()?.removeAllRanges()
        }
        for (const one of elements) one.style.transform = `translate(${dx}px, ${dy}px)`
        const next = settles(over(dx, dy), cells, grid!)
        if (JSON.stringify(next) !== JSON.stringify(spots)) setCarried((spots = next))
      },
      () => {
        if (!spots) return
        // The press that carried them is not a press on one.
        addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => removeEventListener('click', swallow, true))
        place(elements, spots)
      },
    )
  }

  // The box is drawn from where the drag started to the pointer, and selects every app it touches while it is drawn;
  // a press that does not stray selects none. The focus is on the desk.
  function draw(event: PointerEvent<HTMLElement>) {
    event.preventDefault()
    ;(document.activeElement as HTMLElement | null)?.blur()
    if (selected.length) onSelect!([])
    const origin = event.currentTarget.getBoundingClientRect()
    const from = { x: event.clientX - origin.x, y: event.clientY - origin.y }
    const apps = drawn().map((element) => {
      const tile = element.getBoundingClientRect()
      return {
        app: element.getAttribute('href')!,
        x: tile.x - origin.x,
        y: tile.y - origin.y,
        r: tile.right - origin.x,
        b: tile.bottom - origin.y,
      }
    })
    for (const fading of boxed.current?.getAnimations() ?? []) fading.cancel()
    let touched = ''
    follow(
      event.pointerId,
      ({ clientX, clientY }) => {
        // It keeps to the desk.
        const x = Math.min(Math.max(clientX - origin.x, 0), origin.width)
        const y = Math.min(Math.max(clientY - origin.y, 0), origin.height)
        const drawing = {
          x: Math.min(x, from.x),
          y: Math.min(y, from.y),
          w: Math.abs(x - from.x),
          h: Math.abs(y - from.y),
        }
        setBox(drawing)
        const within = apps
          .filter(
            (one) =>
              one.x <= drawing.x + drawing.w &&
              one.r >= drawing.x &&
              one.y <= drawing.y + drawing.h &&
              one.b >= drawing.y,
          )
          .map((one) => one.app)
        if (within.join() !== touched) onSelect!(within)
        touched = within.join()
      },
      () => boxed.current && fade(boxed.current, () => setBox(null)),
    )
  }

  // Shift, or the key that adds to a selection, and a press on an app adds it or takes it out, and does not open it.
  function pick(event: MouseEvent<HTMLElement>) {
    const element = (event.target as Element).closest<HTMLElement>('.app')
    if (!element || !toggles(event)) return
    event.preventDefault()
    const app = element.getAttribute('href')!
    onSelect!(selected.includes(app) ? selected.filter((one) => one !== app) : [...selected, app])
  }

  // Shift and an arrow move the app that has the focus a cell, over those taken, and the others selected with it.
  function key(event: KeyboardEvent<HTMLElement>) {
    const element = (event.target as Element).closest<HTMLElement>('.app')
    const to = arrows[event.key]
    if (!onPlace || !cells || !element || !to || !event.shiftKey || event.altKey) return
    if (event.metaKey || event.ctrlKey) return
    event.preventDefault()
    const app = element.getAttribute('href')!
    const group = selected.includes(app) && selected.length > 1 ? selected : null
    if (group) place(drawn(group), steppedTogether(group, to, cells, grid!))
    else place([element], { [app]: stepped(app, to, cells, grid!) })
  }

  const at = (cell?: Cell) =>
    cell && ({ '--col': cell[0] + 1, '--row': cell[1] + 1 } as CSSProperties)

  return (
    <nav
      aria-label={props.label}
      aria-multiselectable={onSelect ? true : undefined}
      className="apps"
      data-layout={props.layout}
      data-moves={onPlace ? '' : undefined}
      inert={props.inert}
      onClick={onSelect && pick}
      onDragStart={onPlace && ((event) => event.preventDefault())}
      onKeyDown={onPlace && key}
      onPointerDown={onPlace && press}
      ref={nav}
      role={onSelect ? 'listbox' : undefined}
    >
      {props.apps.map(({ tile, file: _, ...app }) => {
        const desk = app.screen !== 'phone'
        const lifted = desk && !!carried?.[app.href]
        return (
          <App
            key={`${app.screen}${app.href}`}
            {...app}
            role={onSelect && desk ? 'option' : undefined}
            selected={desk && selected.includes(app.href)}
            state={lifted ? 'carried' : undefined}
            style={{
              ...at(desk ? shown?.[app.href] : undefined),
              zIndex: lifted ? props.above : undefined,
            }}
            tile={tile ?? undefined}
          />
        )
      })}
      {Object.entries(carried ?? {}).map(([app, spot]) => (
        <span aria-hidden className="apps__spot" key={app} style={at(spot)} />
      ))}
      {box && (
        <span
          aria-hidden
          className="apps__box"
          ref={boxed}
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
      )}
    </nav>
  )
}

// Shift, or Ctrl (⌘ on a Mac), with a press adds to a selection.
const toggles = (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) =>
  event.shiftKey ||
  (document.documentElement.dataset.keys === 'apple' ? event.metaKey : event.ctrlKey)

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
