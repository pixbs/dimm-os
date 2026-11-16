'use client'

import {
  type MouseEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
} from 'react'

import type { View, WindowView } from '@/data/views'
import { change } from '@/ds/atoms/settings'
import { Bar, BarSpace, BarText } from '@/ds/molecules/Bar'
import { Button, ButtonLink } from '@/ds/molecules/Button'
import { Key } from '@/ds/molecules/Key'
import { Tag } from '@/ds/molecules/Tag'
import { MenuBar } from '@/ds/organisms/Menu'
import { Dock, Screen, Skip, Taskbar } from '@/ds/organisms/Screen'
import { fromAddress, type Language, languages, toAddress, toRoute } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'

import { Clock } from './Clock'
import { keyAction } from './keys'
import { type Action, front, manager, phone, stack, start } from './manager'
import { menus } from './menus'
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
  // On a phone the menus that are open are drawers in front of the windows.
  const [unfolded, setMenus] = useState(0)

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
    // The address is written already, so the page the browser loads takes its place.
    void open(act, path, anchor, () => location.replace(anchor.href))
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

  // The keys act from wherever the focus is; the switch on the root is read at each press. A key opens its window
  // as the menu's link to it does.
  const keyDown = useEffectEvent((event: KeyboardEvent) => {
    const single = document.documentElement.dataset.shortcuts !== 'off'
    const action = keyAction(event, view.keys, single, desk)
    if (!action) return
    event.preventDefault()
    // Search arrives with the palette: until then its key is the desk's and does nothing, as its row in File.
    if (action === 'search') return
    if (action.type === 'open') {
      void open(act, action.path, null, () => location.replace(toAddress(language, action.path)))
    } else act(action)
  })
  useEffect(() => {
    addEventListener('keydown', keyDown)
    return () => removeEventListener('keydown', keyDown)
  }, [])

  // In the taskbar a window goes by the name its bar shows, in the dock by its title.
  const tasks = tasksOf(desk)
  const pick = (index: number, opener: Element) =>
    act({ type: 'task', path: desk.open[index].path, opener })

  const other = languages.find((one) => one !== language)!
  const legal = (
    [
      ['/imprint', dictionary.imprint],
      ['/privacy-policy', dictionary.privacy],
      ['/cookies', dictionary.cookies],
    ] as const
  ).map(([path, label]) => ({ href: toAddress(language, path), label }))
  const preferences = { href: toAddress(language, '/preferences'), label: dictionary.preferences }
  const [before, after] = dictionary.hotkeyHint.split('{key}')

  return (
    <Screen fill onClick={follow}>
      <header data-surface="desktop">
        {top && <Skip label={dictionary.skip} to={idOf(top)} />}
        <MenuBar
          drawer={phone(desk)}
          label={dictionary.menuBar}
          menus={menus({ t: dictionary, language, name: view.site.name, desk, act })}
          onDepth={setMenus}
          size="chrome"
          t={dictionary}
        >
          <BarSpace />
          <Button
            data-for="pointer"
            hint={named(language, systemKeys.search)}
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
        </MenuBar>
      </header>
      {/* The room under the menu bar: the desk, and on a phone its foot, which drawers rise over. */}
      <div className="screen__main">
        <OnDesk
          apps={view.shortcuts}
          desk={desk}
          dispatch={act}
          label={dictionary.apps}
          over={phone(desk) ? unfolded : 0}
          t={dictionary}
        >
          {(opened) => <Sections dictionary={dictionary} view={opened} />}
        </OnDesk>
        <footer data-for="phone" inert={phone(desk) && stack(desk).length > 0}>
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
      </div>
      <footer data-for="desk" data-surface="desktop">
        <Taskbar onPick={pick} size="chrome" tasks={tasks}>
          <BarText data-for="wide pointer keys">
            {before}
            <Key name={named(language, systemKeys.hotkeys)} />
            {after}
          </BarText>
          {[...legal, preferences].map((link) => (
            <ButtonLink key={link.href} {...link} size="chrome" />
          ))}
        </Taskbar>
      </footer>
    </Screen>
  )
}
