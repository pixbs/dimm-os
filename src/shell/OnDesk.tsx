'use client'

import { AnimatePresence } from 'motion/react'
import { type ReactNode, useEffect, useEffectEvent, useRef } from 'react'

import type { WindowView } from '@/data/views'
import { usePainted } from '@/ds/motion/vocabulary'
import { Apps, type Shortcut, type Task } from '@/ds/organisms/Screen'
import { type Box, Window } from '@/ds/organisms/Window'
import type { Dictionary } from '@/i18n/en'

import { type Action, front, manager, shown, type Windows } from './manager'

type Entry = Windows['open'][number]

// What its bar and its taskbar button call a window: the end of its path, with its kind once its view is here.
const named = ({ path, view }: Entry) =>
  path.split('/').pop() + (view?.frame.kind ? `.${view.frame.kind}` : '')

// The id of a window's element; its taskbar button carries the same after "task".
export const idOf = (path: string) => `window${path.replaceAll('/', '-')}`

// Each open window has a button: the one in front is selected, one put away has a hollow mark.
export const tasksOf = (desk: Windows): Task[] =>
  desk.open.map((entry) => ({
    id: `task-${idOf(entry.path)}`,
    name: named(entry),
    tile: entry.view?.frame.tile,
    front: entry.path === front(desk),
    minimised: entry.mode === 'min',
  }))

// What lies on the desk: the apps, and the windows its manager keeps.
export function OnDesk(props: {
  desk: Windows
  dispatch: (action: Action) => void
  apps: Shortcut[]
  label?: string
  t: Dictionary
  children: (view: WindowView) => ReactNode
}) {
  const { desk, dispatch, t } = props
  const ground = useRef<HTMLElement>(null)
  // "One window at a time" also means that nothing drags; the server does not know the setting.
  const still = !usePainted() && document.documentElement.dataset.single === 'on'
  const measured = useEffectEvent((w: number, h: number) => dispatch({ type: 'desk', w, h }))

  // The manager places and clamps by the size of the desk, whenever that changes.
  useEffect(() => {
    const element = ground.current!
    const sized = new ResizeObserver(() => measured(element.clientWidth, element.clientHeight))
    sized.observe(element)
    return () => sized.disconnect()
  }, [])

  // What a window in full screen covers cannot be reached: the apps, and the windows behind it.
  const modes = new Map(desk.open.map((entry) => [entry.path, entry.mode]))
  const covering = Math.max(-1, ...desk.z.map((path, at) => (modes.get(path) === 'full' ? at : -1)))

  return (
    <main className="screen__desk" ref={ground}>
      <Apps apps={props.apps} inert={covering >= 0} label={props.label} layout="screen" />
      <AnimatePresence>
        {desk.open.map((entry) => (
          <Window
            act={(action) => dispatch({ ...action, path: entry.path })}
            after={(gesture) =>
              shown(manager(desk, { ...gesture, path: entry.path }), entry.path) as Box
            }
            away={entry.mode === 'min'}
            box={shown(desk, entry.path)}
            front={entry.path === front(desk)}
            full={entry.mode === 'full' || (entry.mode === 'min' && entry.was === 'full')}
            id={idOf(entry.path)}
            inert={desk.z.indexOf(entry.path) < covering}
            key={entry.path}
            level={desk.z.indexOf(entry.path) + 1}
            name={[named(entry)]}
            oneSize={entry.view?.frame.oneSize}
            opener={entry.opener}
            sizing={desk.sizing === entry.path}
            still={still}
            t={t}
            takesFocus={entry.opener !== undefined}
            task={`task-${idOf(entry.path)}`}
            title={entry.view?.frame.title ?? named(entry)}
            waiting={!entry.view}
          >
            {entry.view && props.children(entry.view)}
          </Window>
        ))}
      </AnimatePresence>
    </main>
  )
}
