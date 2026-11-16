import type { HTMLAttributes, ReactNode } from 'react'

import type { IconName } from '../atoms/Icon'
import { App } from '../molecules/App'
import { Bar, BarSpace } from '../molecules/Bar'
import { Button, ButtonGroup } from '../molecules/Button'
import { Wallpaper } from './Wallpaper'

export type Tile = 'raised' | 'paper' | 'orange' | 'blue' | 'mint'

// The whole display: the wallpaper behind everything, and the bars and the desk in front of it. It is a desk
// from 600 px wide and a phone below; filling the browser's window, that is the window's width.
export function Screen({
  fill,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { fill?: boolean }) {
  return (
    <div
      {...rest}
      className={className ? `screen ${className}` : 'screen'}
      data-fill={fill ? '' : undefined}
      data-surface="desktop"
    >
      <Wallpaper />
      {children}
    </div>
  )
}

export type Shortcut = { href: string; name: string; icon: IconName; tile: Tile | null }

// The apps the admin has defined, on the desk: a column, four across, or the one the screen's width asks for.
export function Apps(props: {
  apps: Shortcut[]
  layout: 'column' | 'grid' | 'screen'
  label?: string
}) {
  return (
    <nav aria-label={props.label} className="apps" data-layout={props.layout}>
      {props.apps.map(({ tile, ...app }) => (
        <App key={app.href} {...app} tile={tile ?? undefined} />
      ))}
    </nav>
  )
}

// A window as the taskbar and the dock show it: the window in front is selected, one minimised has a hollow mark.
export type Task = { name: string; tile?: Tile | null; front?: boolean; minimised?: boolean }

const mark = (task: Task, coloured: boolean) => (
  <span
    className="mark"
    data-surface={(coloured && task.tile) || undefined}
    data-tone={task.minimised ? 'off' : undefined}
  />
)

// The foot of a desk: one button per window, led by the mark of its app, and the tray at its end.
export function Taskbar(props: {
  tasks: Task[]
  size?: 'compact' | 'chrome'
  onPick?: (index: number) => void
  children?: ReactNode
}) {
  return (
    <Bar line="above">
      {props.tasks.map((task, index) => (
        <Button
          aria-current={task.front || undefined}
          key={index}
          label={task.name}
          lead={mark(task, true)}
          onClick={props.onPick && (() => props.onPick!(index))}
          size={props.size}
          tone={task.front ? 'solid' : undefined}
        />
      ))}
      <BarSpace />
      {props.children}
    </Bar>
  )
}

// The taskbar of a phone: a button group with one cell per window, one step in from the edges.
export function Dock(props: { tasks: Task[]; label?: string; onPick?: (index: number) => void }) {
  return (
    <nav aria-label={props.label} className="dock">
      <div data-surface="window">
        <ButtonGroup cells>
          {props.tasks.map((task, index) => (
            <Button
              aria-current={task.front || undefined}
              key={index}
              label={task.name}
              lead={mark(task, false)}
              onClick={props.onPick && (() => props.onPick!(index))}
              tone={task.front ? 'solid' : 'outline'}
            />
          ))}
        </ButtonGroup>
      </div>
    </nav>
  )
}
