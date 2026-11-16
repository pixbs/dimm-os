'use client'

import {
  type MouseEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
} from 'react'

import type { View, WindowView } from '@/data/views'
import { change } from '@/ds/atoms/settings'
import { Bar, BarSpace } from '@/ds/molecules/Bar'
import { Button, ButtonLink } from '@/ds/molecules/Button'
import { Tag } from '@/ds/molecules/Tag'
import { Dock, Screen, Skip, Taskbar } from '@/ds/organisms/Screen'
import { fromAddress, type Language, languages, toAddress, toRoute } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named } from '@/i18n/keys'

import { Clock } from './Clock'
import { type Action, front, manager, start } from './manager'
import { idOf, OnDesk, tasksOf } from './OnDesk'

const STORE = 'windows'

async function fetchWindow(language: Language, path: string): Promise<WindowView | null> {
  try {
    const response = await fetch(`/view${toRoute(language, path)}`)
    const view: View | null = response.ok ? await response.json() : null
    return view?.window ?? null
  } catch {
    return null
  }
}

// The paths this tab had open, back to front.
function stored(): string[] {
  try {
    const paths: unknown = JSON.parse(sessionStorage.getItem(STORE) ?? '[]')
    return Array.isArray(paths) ? paths.filter((path) => typeof path === 'string') : []
  } catch {
    return []
  }
}

function store(paths: string[]) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(paths))
  } catch {
    // A tab without storage only loses its other windows on a reload.
  }
}

// The prototype's methods leave out the Next.js router: it wraps the history's own, and would
// fetch a page and remount the desk when Back crosses a reload.
function write(method: 'pushState' | 'replaceState', address?: string) {
  History.prototype[method].call(history, null, '', address)
}

// What a window holds until the sections arrive: its title, its text, its items and its neighbours.
function Sections({ view, dictionary }: { view: WindowView; dictionary: Dictionary }) {
  const { frame, sections, counters, neighbours } = view

  return (
    <div style={{ padding: 'var(--inset)' }}>
      <h1>{frame.title}</h1>
      {sections.map((section, index) =>
        section.type === 'text' ? (
          <div dangerouslySetInnerHTML={{ __html: section.html }} key={index} />
        ) : (
          <ul key={index}>
            {section.items.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.title}</a>
              </li>
            ))}
          </ul>
        ),
      )}
      <footer>
        {neighbours.previous && (
          <a href={neighbours.previous.href} rel="prev">
            {dictionary.previous}
          </a>
        )}
        <p>
          {counters.position} / {counters.total}
        </p>
        {neighbours.next && (
          <a href={neighbours.next.href} rel="next">
            {dictionary.next}
          </a>
        )}
      </footer>
    </div>
  )
}

export function Desk({ dictionary, view }: { dictionary: Dictionary; view: View }) {
  const { language } = view
  // The first render takes its window from the view alone, so it matches the server's HTML at any address.
  const [desk, dispatch] = useReducer(manager, view.window, start)
  const restored = useRef(false)
  const top = front(desk)

  // The address follows the window in front: picking one adds an entry, and when it leaves the next takes its place.
  function act(action: Action) {
    dispatch(action)
    const next = front(manager(desk, action))
    const address = toAddress(language, next ?? '/')
    if (location.pathname === address) return
    if ('path' in action && action.path === next) write('pushState', address)
    else if (next !== top) write('replaceState', address)
  }

  // A window opens at once and fills when its view arrives; without one, the address is the browser's to show.
  async function open(to: typeof act, path: string, opener: Element | null, lost: () => void) {
    // Drawing it is a transition, so a slow device still answers the press that asked for it within a frame.
    startTransition(() =>
      to({ type: 'open', path, opener, alone: document.documentElement.dataset.single === 'on' }),
    )
    if (desk.z.includes(path)) return

    const opened = await fetchWindow(language, path)
    if (opened) dispatch({ type: 'fill', window: opened })
    else lost()
  }

  // A plain link to a window opens it here; any other link is the browser's.
  function follow(event: MouseEvent) {
    const anchor = (event.target as Element).closest('a')
    if (!anchor || anchor.origin !== location.origin || anchor.target || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (anchor.hash || anchor.search || anchor.hasAttribute('download')) return

    const { language: theirs, path } = fromAddress(anchor.pathname)
    if (theirs !== language || path === '/') return

    event.preventDefault()
    void open(act, path, anchor, () => location.assign(anchor.href))
  }

  // Back and Forward bring the window of their address to the front, opening it again if it was closed since.
  const arrive = useEffectEvent(() => {
    const { path } = fromAddress(location.pathname)
    if (path !== '/') void open(dispatch, path, null, () => location.reload())
  })
  useEffect(() => {
    addEventListener('popstate', arrive)
    return () => removeEventListener('popstate', arrive)
  }, [])

  // The server knows the window of the address alone: the others come back from this tab's session.
  useEffect(() => {
    // The router keeps its page in the entry a document loads in: emptied, that entry is the desk's as well.
    write('replaceState')

    const paths = stored().filter((path) => path !== view.window?.path)
    void Promise.all(paths.map((path) => fetchWindow(language, path))).then((found) => {
      restored.current = true
      dispatch({ type: 'restore', windows: found.filter((opened) => opened !== null) })
    })
  }, [language, view])

  useEffect(() => {
    if (restored.current) store(desk.z)
  }, [desk.z])

  // In the taskbar a window goes by the name its bar shows, in the dock by its title.
  const tasks = tasksOf(desk)
  const pick = (index: number) => act({ type: 'task', path: desk.open[index].path })

  const other = languages.find((one) => one !== language)!
  const legal = (
    [
      ['/imprint', dictionary.imprint],
      ['/privacy-policy', dictionary.privacy],
      ['/cookies', dictionary.cookies],
    ] as const
  ).map(([path, label]) => ({ href: toAddress(language, path), label }))
  const preferences = { href: toAddress(language, '/preferences'), label: dictionary.preferences }

  return (
    <Screen fill onClick={follow}>
      <header data-surface="desktop">
        {top && <Skip label={dictionary.skip} to={idOf(top)} />}
        <Bar line="below" size="chrome">
          <Button data-for="desk touch" icon="menu" name={dictionary.menu} size="chrome" />
          <Button
            label={view.site.name}
            lead={<span className="mark" data-surface="orange" />}
            size="chrome"
          />
          {[dictionary.file, dictionary.view, dictionary.window, dictionary.help].map((menu) => (
            <Button data-for="desk pointer" key={menu} label={menu} size="chrome" />
          ))}
          <BarSpace />
          <Button
            data-for="pointer"
            hint={named(language, ['mod', 'K'])}
            icon="search"
            keyed
            name={dictionary.search}
            size="chrome"
          />
          <Button data-for="touch" icon="search" name={dictionary.search} size="chrome" />
          <Button
            data-for="desk pointer"
            icon="contrast"
            name={dictionary.theme}
            onClick={() =>
              change({
                theme: document.documentElement.dataset.theme === 'light' ? 'dark' : 'light',
              })
            }
            size="chrome"
          />
          <ButtonLink
            aria-label={dictionary.language}
            data-for="desk"
            href={toAddress(other, top ?? '/')}
            hrefLang={other}
            label={language.toUpperCase()}
            size="chrome"
          />
          <Button label={dictionary.guest} lead={<Tag>{dictionary.guest[0]}</Tag>} size="chrome" />
          <Clock language={language} zone={view.site.timezone} />
        </Bar>
      </header>
      <OnDesk
        apps={view.shortcuts}
        desk={desk}
        dispatch={act}
        label={dictionary.apps}
        t={dictionary}
      >
        {(opened) => <Sections dictionary={dictionary} view={opened} />}
      </OnDesk>
      <footer data-for="phone">
        <Bar>
          {legal.map((link) => (
            <ButtonLink key={link.href} {...link} />
          ))}
        </Bar>
        {tasks.length > 0 && (
          <Dock
            label={dictionary.windows}
            onPick={pick}
            tasks={tasks.map((task, index) => ({
              ...task,
              name: desk.open[index].view?.frame.title ?? task.name,
            }))}
          />
        )}
      </footer>
      <footer data-for="desk" data-surface="desktop">
        <Taskbar onPick={pick} size="chrome" tasks={tasks}>
          {[...legal, preferences].map((link) => (
            <ButtonLink key={link.href} {...link} size="chrome" />
          ))}
        </Taskbar>
      </footer>
    </Screen>
  )
}
