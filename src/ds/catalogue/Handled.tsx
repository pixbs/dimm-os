'use client'

import { type MouseEvent, useReducer, useState } from 'react'

import type { Dictionary } from '@/i18n/en'
import { manager, start } from '@/shell/manager'
import { OnDesk, tasksOf } from '@/shell/OnDesk'

import { Bar, BarSpace, BarText } from '../molecules/Bar'
import { Button, ButtonGroup } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { duration } from '../motion/vocabulary'
import { Screen, Taskbar } from '../organisms/Screen'
import { Window } from '../organisms/Window'
import type { Copy } from './copy/en'
import { u } from './parts'

type Props = { t: Copy['shell']; words: Dictionary }

const tiles = ['orange', 'blue', 'mint'] as const
const icons = ['folder', 'image', 'clock'] as const

// A desk that takes the window manager whole: its shortcuts open windows, and the view of the last is slow to come.
export function Handled({ t, words }: Props) {
  const [desk, dispatch] = useReducer(manager, null, start)

  function open(name: string, opener: Element | null) {
    const path = `/${name}`
    const at = t.handledNames.indexOf(name)
    const fill = () =>
      dispatch({
        type: 'fill',
        window: {
          path,
          frame: { title: name, kind: null, tile: tiles[at] ?? null },
          sections: [],
          count: 0,
          parent: null,
          counters: null,
          neighbours: { previous: null, next: null },
        },
      })

    dispatch({
      type: 'open',
      path,
      opener,
      alone: document.documentElement.dataset.single === 'on',
    })
    if (at === 2) setTimeout(fill, duration('long') * 1000)
    else fill()
  }

  function follow(event: MouseEvent) {
    const shortcut = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!shortcut) return
    event.preventDefault()
    open(t.handledNames[Number(shortcut.hash.slice(1))], shortcut)
  }

  return (
    <div className="played">
      <button className="play" onClick={() => open(t.handledOther, null)} type="button">
        {t.handledUnopened}
      </button>
      <Screen onClick={follow} style={{ width: u(138), height: u(80) }}>
        <header data-surface="desktop">
          <Bar line="below" size="compact">
            <Button
              label={t.name}
              lead={<span className="mark" data-surface="orange" />}
              size="compact"
            />
            <BarSpace />
            <BarText>{t.clock}</BarText>
          </Bar>
        </header>
        <OnDesk
          apps={t.handledNames.map((name, at) => ({
            href: `#${at}`,
            name,
            icon: icons[at],
            tile: tiles[at],
          }))}
          desk={desk}
          dispatch={dispatch}
          t={words}
        >
          {(view) => ({
            body: (
              <div className="stage">
                <Heading level="heading" text={t.windowText} title={view.frame.title} />
              </div>
            ),
          })}
        </OnDesk>
        <footer data-surface="desktop">
          <Taskbar
            onPick={(index) => dispatch({ type: 'task', path: desk.open[index].path })}
            size="compact"
            tasks={tasksOf(desk)}
          />
        </footer>
      </Screen>
    </div>
  )
}

// A window whose foot asks for other content: what replaces the old comes from where the visitor is heading.
export function Replaced({ t, words }: Props) {
  const [at, setAt] = useState(0)
  const [travel, setTravel] = useState<'forward' | 'back'>('forward')
  const go = (by: number) => () => {
    setTravel(by > 0 ? 'forward' : 'back')
    setAt((at + by + t.replaced.length) % t.replaced.length)
  }

  return (
    <Window
      content={t.replaced[at]}
      foot={
        <ButtonGroup>
          <Button label={words.previous} onClick={go(-1)} tone="outline" />
          <Button end="arrow-right" label={words.next} onClick={go(1)} tone="outline" />
        </ButtonGroup>
      }
      front
      name={[t.files[0]]}
      t={words}
      title={t.window}
      travel={travel}
    >
      <div className="stage">
        <Heading level="heading" text={t.windowText} title={t.replaced[at]} />
      </div>
    </Window>
  )
}
