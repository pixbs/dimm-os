'use client'

import { type MouseEvent, useEffect, useReducer, useRef } from 'react'

import type { View, WindowView } from '@/data/views'
import { fromAddress, type Language, toAddress, toRoute } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'

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

export function Desk({ dictionary, view }: { dictionary: Dictionary; view: View }) {
  const { language } = view
  // The first render takes its window from the view alone, so it matches the server's HTML at any address.
  const [desk, dispatch] = useReducer(manager, view.window, start)
  const restored = useRef(false)

  // Picking a window writes its address as a new history entry.
  function show(path: string) {
    const address = toAddress(language, path)
    if (location.pathname !== address) history.pushState(null, '', address)
  }

  function close(path: string) {
    dispatch({ type: 'close', path })
    // The address follows the window that comes forward.
    if (front(desk) === path) {
      history.replaceState(null, '', toAddress(language, desk.z.at(-2) ?? '/'))
    }
  }

  // A plain link to a window opens it here; any other link, and a view that cannot be fetched, is the browser's.
  async function follow(event: MouseEvent) {
    const anchor = (event.target as Element).closest('a')
    if (!anchor || anchor.origin !== location.origin || anchor.target || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

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
    const paths = stored().filter((path) => path !== view.window?.path)
    void Promise.all(paths.map((path) => fetchWindow(language, path))).then((found) => {
      restored.current = true
      dispatch({ type: 'restore', windows: found.filter((opened) => opened !== null) })
    })
  }, [language, view])

  useEffect(() => {
    if (restored.current) store(desk.z)
  }, [desk.z])

  return (
    <main onClick={follow}>
      <nav aria-label={dictionary.windows}>
        <ul>
          {view.shortcuts.map((shortcut) => (
            <li key={shortcut.href}>
              <a href={shortcut.href}>{shortcut.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      {desk.open.map(({ path, frame, sections, counters, neighbours }) => (
        <article
          data-front={path === front(desk) ? '' : undefined}
          key={path}
          onPointerDown={() => {
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
  )
}
