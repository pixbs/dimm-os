'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import type { ComponentProps, ReactNode } from 'react'

import type { IconName } from '../atoms/Icon'
import { App } from '../molecules/App'
import { Bar, BarSpace } from '../molecules/Bar'
import { Button, ButtonGroup, ButtonLink } from '../molecules/Button'
import { ways } from '../motion/Origin'
import { usePainted } from '../motion/vocabulary'
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
  // Its wallpaper is drawn once it arrives.
  wallpaper?: boolean
}) {
  return (
    <div
      {...rest}
      className={className ? `screen ${className}` : 'screen'}
      data-fill={fill ? '' : undefined}
      data-surface="desktop"
      data-waiting={waiting ? '' : undefined}
    >
      {wallpaper && <Wallpaper />}
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
}

// The apps the admin has defined, on the desk: a column, four across, or the one the screen's width asks for.
export function Apps(props: {
  apps: Shortcut[]
  layout: 'column' | 'grid' | 'screen'
  label?: string
  // Covered by a window in full screen, they cannot be reached.
  inert?: boolean
}) {
  return (
    <nav aria-label={props.label} className="apps" data-layout={props.layout} inert={props.inert}>
      {props.apps.map(({ tile, ...app }) => (
        <App key={app.href} {...app} tile={tile ?? undefined} />
      ))}
    </nav>
  )
}

// A window as the taskbar and the dock show it: the window in front is selected, one minimised has a hollow mark.
export type Task = {
  // The id of its button, which its window shrinks into.
  id?: string
  name: string
  tile?: Tile | null
  front?: boolean
  minimised?: boolean
}

const TaskButton = m.create(Button)
const fast = ways('fast')

// One button per window, led by the mark of its app: it comes and goes at its own place as its window does.
function Tasks(props: {
  tasks: Task[]
  onPick?: (index: number, button: HTMLElement) => void
  button: (task: Task) => Pick<ComponentProps<typeof Button>, 'id' | 'lead' | 'size' | 'tone'>
}) {
  const painted = usePainted()

  return (
    <AnimatePresence initial={false}>
      {props.tasks.map((task, index) => (
        <TaskButton
          {...props.button(task)}
          animate="open"
          aria-current={task.front || undefined}
          exit="closed"
          initial="closed"
          key={task.id ?? index}
          label={task.name}
          onClick={props.onPick && ((event) => props.onPick!(index, event.currentTarget))}
          variants={painted ? undefined : fast}
        />
      ))}
    </AnimatePresence>
  )
}

const mark = (task: Task, coloured: boolean) => (
  <span
    className="mark"
    data-surface={(coloured && task.tile) || undefined}
    data-tone={task.minimised ? 'off' : undefined}
  />
)

// The foot of a desk: one button per window, and the tray at its end.
export function Taskbar(props: {
  tasks: Task[]
  size?: 'compact' | 'chrome'
  onPick?: (index: number, button: HTMLElement) => void
  children?: ReactNode
}) {
  return (
    <Bar line="above">
      <Tasks
        button={(task) => ({
          id: task.id,
          lead: mark(task, true),
          size: props.size,
          tone: task.front ? 'solid' : undefined,
        })}
        onPick={props.onPick}
        tasks={props.tasks}
      />
      <BarSpace />
      {props.children}
    </Bar>
  )
}

// The taskbar of a phone: a button group with one cell per window, one step in from the edges.
export function Dock(props: {
  tasks: Task[]
  label?: string
  onPick?: (index: number, button: HTMLElement) => void
}) {
  return (
    <nav aria-label={props.label} className="dock">
      <div data-surface="window">
        <ButtonGroup cells>
          <Tasks
            button={(task) => ({
              lead: mark(task, false),
              tone: task.front ? 'solid' : 'outline',
            })}
            onPick={props.onPick}
            tasks={props.tasks}
          />
        </ButtonGroup>
      </div>
    </nav>
  )
}
