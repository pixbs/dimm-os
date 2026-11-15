import { describe, expect, it } from 'vitest'

import type { WindowView } from '@/data/views'
import { front, manager, start } from '@/shell/manager'

const view = (path: string, title = path): WindowView => ({
  path,
  frame: { title, kind: null },
  sections: [],
  counters: { position: 1, total: 1 },
  neighbours: { previous: null, next: null },
})

const paths = (windows: WindowView[]) => windows.map((window) => window.path)

describe('the window manager', () => {
  it('starts with the window of the view, or with none', () => {
    expect(start(null)).toEqual({ open: [], z: [] })
    expect(front(start(view('/a')))).toBe('/a')
  })

  it('opens a window in front of the others', () => {
    const state = manager(start(view('/a')), { type: 'open', window: view('/b') })

    expect(paths(state.open)).toEqual(['/a', '/b'])
    expect(front(state)).toBe('/b')
  })

  it('brings an open window forward with its new view, where it stands in the page', () => {
    const two = manager(start(view('/a')), { type: 'open', window: view('/b') })
    const state = manager(two, { type: 'open', window: view('/a', 'New') })

    expect(state.open.map((window) => window.frame.title)).toEqual(['New', '/b'])
    expect(state.z).toEqual(['/b', '/a'])
  })

  it('focuses an open window, and changes nothing for the front one or one that is not open', () => {
    const two = manager(start(view('/a')), { type: 'open', window: view('/b') })
    const state = manager(two, { type: 'focus', path: '/a' })

    expect(paths(state.open)).toEqual(['/a', '/b'])
    expect(front(state)).toBe('/a')
    expect(manager(state, { type: 'focus', path: '/a' })).toBe(state)
    expect(manager(state, { type: 'focus', path: '/c' })).toBe(state)
  })

  it('closes a window, and the one behind it comes forward', () => {
    const two = manager(start(view('/a')), { type: 'open', window: view('/b') })
    const one = manager(two, { type: 'close', path: '/b' })

    expect(paths(one.open)).toEqual(['/a'])
    expect(front(one)).toBe('/a')
    expect(front(manager(one, { type: 'close', path: '/a' }))).toBeUndefined()
  })

  it('restores windows behind the open ones, once each', () => {
    const state = manager(start(view('/c')), {
      type: 'restore',
      windows: [view('/a'), view('/b'), view('/c')],
    })

    expect(paths(state.open)).toEqual(['/c', '/a', '/b'])
    expect(state.z).toEqual(['/a', '/b', '/c'])
  })
})
