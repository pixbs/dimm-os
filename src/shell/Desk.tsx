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
import { Button, ButtonGroup, ButtonLink } from '@/ds/molecules/Button'
import { Key } from '@/ds/molecules/Key'
import { Tag } from '@/ds/molecules/Tag'
import { MenuBar } from '@/ds/organisms/Menu'
import { Dock, Screen, Skip, Taskbar } from '@/ds/organisms/Screen'
import { Header } from '@/ds/sections/Header'
import { Section } from '@/ds/sections/Section'
import { fromAddress, type Language, languages, toAddress, toRoute } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'

import { Clock } from './Clock'
import { keyAction } from './keys'
import { type Action, front, manager, phone, showing, stack, start, windowOf } from './manager'
import { menus } from './menus'
import { idOf, OnDesk, type Parts, tasksOf } from './OnDesk'
import { Sections } from './Sections'

const STORE = 'windows'

// A window that moved has a view at another path, which the browser's own load of the address redirects to.
async function fetchWindow(language: Language, path: string): Promise<WindowView | null> {
  try {
    const response = await fetch(`/view${toRoute(language, path)}`)
    const view: View | null = response.ok ? await response.json() : null
    return view?.window?.path === path ? view.window : null
  } catch {
    return null
  }
}

// The paths this tab had open, back to front, or null in a tab that has not shown the desk yet.
function stored(): string[] | null {
  try {
    const paths: unknown = JSON.parse(sessionStorage.getItem(STORE) ?? 'null')
    return Array.isArray(paths) ? paths.filter((path) => typeof path === 'string') : null
  } catch {
    return null
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

const pad = (number: number) => String(number).padStart(2, '0')

// A window's sections in the language they are in, its title until it has any, the list of its items, and as an
// item the way to its neighbours, which ends its body.
function Body({ view, width }: { view: WindowView; width: number }) {
  const { parent, neighbours, sections } = view
  const before = neighbours.previous ?? parent
  const placed = sections.filter((section) => section.type !== 'list')
  const items = sections.flatMap((section) => (section.type === 'list' ? section.items : []))
  return (
    <>
      <div lang={view.lang}>
        {/* A window that does not open with a Header still holds its title once. */}
        {placed[0]?.type !== 'header' && <Header level="title" page title={view.frame.title} />}
        {placed.length > 0 && <Sections sections={placed} width={width} />}
        {items.length > 0 && (
          <Section>
            <ul>
              {items.map((item) => (
                <li key={item.href}>
                  <a href={item.href} lang={item.lang}>
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
      {before && (
        <Section>
          <nav>
            <ButtonGroup>
              <ButtonLink
                href={before.href}
                hrefLang={before.lang}
                icon="arrow-left"
                label={before.title}
                lang={before.lang}
                rel={neighbours.previous ? 'prev' : undefined}
                tone="outline"
              />
              {neighbours.next && (
                <ButtonLink
                  end="arrow-right"
                  href={neighbours.next.href}
                  hrefLang={neighbours.next.lang}
                  label={neighbours.next.title}
                  lang={neighbours.next.lang}
                  rel="next"
                  tone="outline"
                />
              )}
            </ButtonGroup>
          </nav>
        </Section>
      )}
    </>
  )
}

// The parts of a window its view derives: an item's path line, with the way back to its window and its place
// among the items; the count of a window's items; and a line where it is shown in English, or where it answers
// an address with nothing.
function parts(view: WindowView, t: Dictionary, language: Language, width: number): Parts {
  const { parent, counters, count } = view
  const items = (new Intl.PluralRules(language).select(count) === 'one' ? t.item : t.items).replace(
    '{count}',
    String(count),
  )
  const toolbar = parent ? (
    <Bar line="below">
      <ButtonLink
        href={parent.href}
        hrefLang={parent.lang}
        icon="arrow-left"
        label={parent.title}
        lang={parent.lang}
        size="compact"
      />
      <BarSpace />
      {counters && <BarText>{`${pad(counters.position)} / ${pad(counters.total)}`}</BarText>}
    </Bar>
  ) : (
    count > 0 && (
      <Bar line="below">
        <BarText>{items}</BarText>
      </Bar>
    )
  )
  const says = view.lang ? t.inEnglish : view.asked ? t.notFound : null
  const status = says && (
    <Bar line="above" size="compact">
      <BarText>{says}</BarText>
    </Bar>
  )

  return { toolbar, status, body: <Body view={view} width={width} /> }
}

export function Desk({ dictionary, view }: { dictionary: Dictionary; view: View }) {
  const { language } = view
  // The first render takes its window from the view alone, so it matches the server's HTML at any address.
  const [desk, dispatch] = useReducer(manager, view.window, start)
  const restored = useRef(false)
  const top = showing(desk)
  // On a phone the menus that are open are drawers in front of the windows.
  const [unfolded, setMenus] = useState(0)

  // The address follows what the window in front shows: picking a window, or a path in it, adds an entry, and
  // when it leaves the next takes its place. The windows that open with the measured desk are picked by no one.
  function act(action: Action) {
    dispatch(action)
    const after = manager(desk, action)
    if (action.type === 'desk' || after === desk) return
    const next = showing(after)
    const address = toAddress(language, next ?? '/')
    if (location.pathname === address) return
    if ('path' in action && action.path && windowOf(action.path) === windowOf(next ?? '/')) {
      write('pushState', address)
    } else if (next !== top) write('replaceState', address)
  }

  // A window opens at once and fills when its view arrives; without one, the address is the browser's to show.
  async function open(to: typeof act, path: string, opener: Element | null, lost: () => void) {
    // Drawing it is a transition, so a slow device still answers the press that asked for it within a frame.
    startTransition(() =>
      to({ type: 'open', path, opener, alone: document.documentElement.dataset.single === 'on' }),
    )
    if (desk.open.some((entry) => entry.view?.path === path)) return

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
    // A link in the window it opens another path in did not open the window. The address is written already, so
    // the page the browser loads takes its place.
    const inside = anchor.closest('article')?.id === idOf(windowOf(path))
    void open(act, path, inside ? null : anchor, () => location.replace(anchor.href))
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

  // The server knows the window of the address alone: the others come back from this tab's session, and a tab
  // that has not shown the desk yet opens the windows marked to open at start.
  useEffect(() => {
    // The router keeps its page in the entry a document loads in: emptied, that entry is the desk's as well.
    write('replaceState')

    const saved = stored()
    if (!saved) {
      restored.current = true
      const single = document.documentElement.dataset.single === 'on'
      dispatch({ type: 'start', windows: single ? view.start.slice(0, 1) : view.start })
      return
    }
    const here = view.window && windowOf(view.window.path)
    const paths = saved.filter((path) => windowOf(path) !== here)
    void Promise.all(paths.map((path) => fetchWindow(language, path))).then((found) => {
      restored.current = true
      dispatch({ type: 'restore', windows: found.filter((opened) => opened !== null) })
    })
  }, [language, view])

  useEffect(() => {
    if (restored.current)
      store(desk.z.map((path) => desk.open.find((one) => one.path === path)!.at))
  }, [desk])

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
        {front(desk) && <Skip label={dictionary.skip} to={idOf(front(desk)!)} />}
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
          {(opened, width) => parts(opened, dictionary, language, width)}
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
