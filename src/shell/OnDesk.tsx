'use client'

import { AnimatePresence } from 'motion/react'
import { type ReactNode, useEffect, useEffectEvent, useRef } from 'react'

import type { WindowView } from '@/data/views'
import { usePainted } from '@/ds/motion/vocabulary'
import { Apps, type Shortcut, type Task } from '@/ds/organisms/Screen'
import { type Box, Window } from '@/ds/organisms/Window'
import type { Dictionary } from '@/i18n/en'

import { type Action, compact, front, manager, phone, shown, stack, type Windows } from './manager'

type Entry = Windows['open'][number]

// What its view gives a window besides its body: a toolbar, a foot, a status bar, and a title for this desk.
export type Parts = {
  toolbar?: ReactNode
  foot?: ReactNode
  status?: ReactNode
  title?: string
  body: ReactNode
}

// What its bar shows: the path it shows, or the one the 404 window answers, its end with its kind once its view
// is here; its taskbar button shows that end. The kind is never part of the path.
const segmentsOf = ({ at, view }: Entry) => {
  const segments = (view?.asked ?? view?.path ?? at).split('/').slice(1)
  return segments.map((segment, index) =>
    index === segments.length - 1 && view?.frame.kind ? `${segment}.${view.frame.kind}` : segment,
  )
}
const named = (entry: Entry) => segmentsOf(entry).at(-1)!

// The id of a window's element; its taskbar button carries the same after "task".
// A hyphen of the path is doubled, so /a-b and /a/b keep apart.
export const idOf = (path: string) => `window${path.replaceAll('-', '--').replaceAll('/', '-')}`

// Each open window has a button: the one in front is selected, one put away has a hollow mark.
export const tasksOf = (desk: Windows): Task[] =>
  desk.open.map((entry) => ({
    id: `task-${idOf(entry.path)}`,
    name: named(entry),
    tile: entry.view?.frame.tile,
    front: entry.path === front(desk),
    minimised: entry.mode === 'min',
  }))

// Windows open beside the apps, and keep the gap of the desk's top from its far edge.
function roomOf(desk: HTMLElement) {
  const apps = desk.querySelector<HTMLElement>(':scope > .apps')
  const x = apps ? apps.offsetLeft + apps.offsetWidth : 0
  const gap = parseFloat(getComputedStyle(desk).paddingTop)
  return { x, w: Math.max(0, desk.clientWidth - x - gap) }
}

// What lies on the desk: the apps, and the windows its manager keeps.
export function OnDesk(props: {
  desk: Windows
  dispatch: (action: Action) => void
  apps: Shortcut[]
  label?: string
  // Drawers opened in front of the windows, such as menus on a phone.
  over?: number
  t: Dictionary
  // A window's parts from its view, at the width it stands.
  children: (view: WindowView, width: number) => Parts
}) {
  const { desk, dispatch, t } = props
  const ground = useRef<HTMLElement>(null)
  // "One window at a time" also means that nothing drags; the server does not know the setting.
  const still = !usePainted() && document.documentElement.dataset.single === 'on'
  const measured = useEffectEvent((desk: HTMLElement) =>
    dispatch({ type: 'desk', w: desk.clientWidth, h: desk.clientHeight, room: roomOf(desk) }),
  )

  // The manager places and clamps by the size of the desk, whenever that changes.
  useEffect(() => {
    const element = ground.current!
    const sized = new ResizeObserver(() => measured(element))
    sized.observe(element)
    return () => sized.disconnect()
  }, [])

  // What a window in full screen covers cannot be reached, the apps and the windows behind it; on a compact screen
  // nothing takes the whole desk.
  const modes = new Map(desk.open.map((entry) => [entry.path, entry.mode]))
  const covering = compact(desk)
    ? -1
    : Math.max(-1, ...desk.z.map((path, at) => (modes.get(path) === 'full' ? at : -1)))
  // On a phone the windows are drawers, and one that is up is modal: what lies behind it cannot be reached. A drawer
  // knows how many stand in front of it, menus included; one past the stack has three, and is not shown.
  const drawers = phone(desk) ? stack(desk) : null
  const back = (entry: Entry) => {
    if (!drawers) return
    if (entry.mode === 'min') return 0
    const at = drawers.indexOf(entry.path)
    return at < 0 ? 3 : Math.min(3, drawers.length - 1 - at + (props.over ?? 0))
  }

  return (
    <main className="screen__desk" ref={ground}>
      <Apps
        apps={props.apps}
        inert={covering >= 0 || !!drawers?.length}
        label={props.label}
        layout="screen"
      />
      <AnimatePresence>
        {desk.open.map((entry) => {
          const box = shown(desk, entry.path)
          const parts = entry.view && props.children(entry.view, box.w)
          return (
            <Window
              act={(action) => dispatch({ ...action, path: entry.path })}
              after={(gesture) =>
                shown(manager(desk, { ...gesture, path: entry.path }), entry.path) as Box
              }
              away={entry.mode === 'min'}
              back={back(entry)}
              box={box}
              content={entry.view?.path}
              foot={parts?.foot}
              front={entry.path === front(desk)}
              full={entry.mode === 'full' || (entry.mode === 'min' && entry.was === 'full')}
              id={idOf(entry.path)}
              inert={desk.z.indexOf(entry.path) < covering || !!back(entry)}
              key={entry.path}
              level={desk.z.indexOf(entry.path) + 1}
              name={segmentsOf(entry)}
              oneSize={entry.view?.frame.oneSize}
              opener={entry.opener}
              sizing={desk.sizing === entry.path}
              status={parts?.status}
              still={still}
              surface={entry.view?.frame.paper ? 'paper' : undefined}
              t={t}
              takesFocus={entry.opener !== undefined}
              task={`task-${idOf(entry.path)}`}
              title={parts?.title ?? entry.view?.frame.title ?? named(entry)}
              toolbar={parts?.toolbar}
              travel={entry.travel}
              waiting={!entry.view}
            >
              {parts?.body}
            </Window>
          )
        })}
      </AnimatePresence>
    </main>
  )
}
