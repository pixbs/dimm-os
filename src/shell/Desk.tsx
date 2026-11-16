'use client'

import { type MouseEvent, useEffect, useReducer, useRef } from 'react'

import type { View, WindowView } from '@/data/views'
import { change } from '@/ds/atoms/settings'
import { Bar, BarSpace } from '@/ds/molecules/Bar'
import { Button, ButtonLink } from '@/ds/molecules/Button'
import { Tag } from '@/ds/molecules/Tag'
import { Apps, Dock, Screen, Taskbar } from '@/ds/organisms/Screen'
import { fromAddress, type Language, languages, toAddress, toRoute } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named } from '@/i18n/keys'

import { Clock } from './Clock'
import { front, manager, start } from './manager'

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

export function Desk({ dictionary, view }: { dictionary: Dictionary; view: View }) {
  const { language } = view
  // The first render takes its window from the view alone, so it matches the server's HTML at any address.
  const [desk, dispatch] = useReducer(manager, view.window, start)
  const restored = useRef(false)

  // Picking a window writes its address as a new history entry.
  function show(path: string) {
    const address = toAddress(language, path)
    if (location.pathname !== address) write('pushState', address)
  }

  function close(path: string) {
    dispatch({ type: 'close', path })
    // The address follows the window that comes forward.
    if (front(desk) === path) write('replaceState', toAddress(language, desk.z.at(-2) ?? '/'))
  }

  // A plain link to a window opens it here; any other link, and a view that cannot be fetched, is the browser's.
  async function follow(event: MouseEvent) {
    const anchor = (event.target as Element).closest('a')
    if (!anchor || anchor.origin !== location.origin || anchor.target || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (anchor.hash || anchor.search || anchor.hasAttribute('download')) return

    const { language: theirs, path } = fromAddress(anchor.pathname)
    if (theirs !== language || path === '/') return

    event.preventDefault()
    const opened = await fetchWindow(language, path)
    if (!opened) return location.assign(anchor.href)

    dispatch({ type: 'open', window: opened })
    show(path)
  }

  // Back and Forward bring the window of their address to the front, fetching it if it was closed since.
  useEffect(() => {
    async function arrive() {
      const { path } = fromAddress(location.pathname)
      if (path === '/') return
      if (desk.z.includes(path)) return dispatch({ type: 'focus', path })

      const opened = await fetchWindow(language, path)
      if (opened) dispatch({ type: 'open', window: opened })
      else location.reload()
    }

    addEventListener('popstate', arrive)
    return () => removeEventListener('popstate', arrive)
  }, [desk.z, language])

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

  // Each open window has a button: in the taskbar by the name its bar shows, in the dock by its title.
  const tasks = desk.open.map(({ path, frame }) => ({
    name: path.split('/').pop() + (frame.kind ? `.${frame.kind}` : ''),
    tile: frame.tile,
    front: path === front(desk),
  }))
  function pick(index: number) {
    const { path } = desk.open[index]
    dispatch({ type: 'focus', path })
    show(path)
  }

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
            href={toAddress(other, front(desk) ?? '/')}
            hrefLang={other}
            label={language.toUpperCase()}
            size="chrome"
          />
          <Button label={dictionary.guest} lead={<Tag>{dictionary.guest[0]}</Tag>} size="chrome" />
          <Clock language={language} zone={view.site.timezone} />
        </Bar>
      </header>
      <main className="screen__desk">
        <Apps apps={view.shortcuts} label={dictionary.apps} layout="screen" />
        {desk.open.map(({ path, frame, sections, counters, neighbours }) => (
          <article
            data-front={path === front(desk) ? '' : undefined}
            data-surface="window"
            key={path}
            onPointerDown={(event) => {
              // Only a press of the main button picks a window: a context menu or a middle click leaves history alone.
              if (event.button !== 0) return
              dispatch({ type: 'focus', path })
              show(path)
            }}
          >
            <header>
              <h1>{frame.title}</h1>
              {frame.kind && <p>{frame.kind}</p>}
              <button
                onClick={() => close(path)}
                // Closing a window behind the front one leaves the address alone.
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                {dictionary.close}
              </button>
            </header>
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
          </article>
        ))}
      </main>
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
            tasks={tasks.map((task, index) => ({ ...task, name: desk.open[index].frame.title }))}
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
