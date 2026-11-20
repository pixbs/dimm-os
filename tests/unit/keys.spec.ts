import { describe, expect, it } from 'vitest'

import type { WindowView } from '@/data/views'
import { keyAction } from '@/shell/keys'
import { type Action, front, manager, start, type Windows } from '@/shell/manager'

const view = (path: string, oneSize = false): WindowView => ({
  path,
  frame: { title: path, kind: null, tile: null, oneSize },
  sections: [],
  actions: [],
  count: 0,
  kind: null,
  parent: null,
  counters: null,
  neighbours: { previous: null, next: null },
})

const apps = [{ key: 'W', path: '/work', title: 'Work' }]
const after = (state: Windows, ...actions: Action[]) => actions.reduce(manager, state)
const mode = (state: Windows, path: string) =>
  state.open.find((window) => window.path === path)?.mode

// The desk of the reference: welcome in front of work.
const home = (w = 1440, h = 820) =>
  after(
    start(view('/welcome')),
    { type: 'desk', w, h },
    { type: 'open', path: '/work' },
    { type: 'fill', window: view('/work') },
    { type: 'focus', path: '/welcome' },
  )

// Shift is held for some keys, such as ?, and the map does not ask about it.
type Press = Parameters<typeof keyAction>[0] & { shiftKey?: boolean }
const press = (key: string, more: Partial<Press> = {}): Press => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  target: null,
  ...more,
})
// What is in a field: the reference stands an element in for it that finds a field around itself.
const field = {
  closest: (selector: string) => (selector.includes('input') ? {} : null),
} as unknown as EventTarget

// The checks of the handoff's reference that concern keys, in its order and by its names.
describe('the keys, as the reference checks them', () => {
  let desk = home()
  // A key the map answers acts on the desk as the shell runs it, and is said to have been taken.
  const key = (key: string, more: Partial<Press> = {}, single = true) => {
    const action = keyAction(press(key, more), apps, single, desk)
    if (action && action !== 'search') desk = manager(desk, action)
    return action
  }

  it('Esc leaves full screen first', () => {
    desk = after(desk, { type: 'full', path: '/welcome' })
    key('Escape')

    expect(mode(desk, '/welcome')).toBe('float')
  })

  it('Esc then closes: out of the taskbar', () => {
    key('Escape')

    expect(desk.open.map((window) => window.path)).toEqual(['/work'])
  })

  it('W opens work', () => {
    desk = after(desk, { type: 'open', path: '/welcome' })
    key('w')

    expect(front(desk)).toBe('/work')
  })

  it('? opens hotkeys.sys', () => {
    key('?', { shiftKey: true })

    expect(front(desk)).toBe('/hotkeys')
    desk = after(desk, { type: 'fill', window: view('/hotkeys', true) })
  })

  it('N goes to the next window', () => {
    key('n')

    expect(front(desk)).not.toBe('/hotkeys')
  })

  it('M minimises one after another', () => {
    key('m')
    key('m')
    key('M')

    expect(desk.open.map((window) => window.mode)).toEqual(['min', 'min', 'min'])
    expect(front(desk)).toBeUndefined()
  })

  it('M with nothing in front brings the last one back', () => {
    key('m')

    expect(front(desk)).toBeDefined()
  })

  it('keys are not taken while typing, but search', () => {
    const before = desk
    for (const one of ['f', 'm', 'n', 'w', '?', ',', 'Escape'])
      expect(key(one, { target: field })).toBeNull()
    expect(key('k', { metaKey: true, target: field })).toBe('search')

    expect(desk).toBe(before)
  })

  it('⌘K opens the palette', () => {
    expect(key('k', { metaKey: true })).toBe('search')
    expect(key('K', { ctrlKey: true, shiftKey: true })).toBe('search')
  })

  it('Esc closes a menu before it closes a window', () => {
    // A menu takes Esc for itself, so the key map does not see it.
    const before = desk
    expect(key('Escape', { defaultPrevented: true })).toBeNull()

    expect(desk).toBe(before)
  })
})

describe('the key map', () => {
  const desk = home()
  const action = (key: string, more: Partial<Press> = {}, single = true, on = desk) =>
    keyAction(press(key, more), apps, single, on)

  it('opens Preferences with a comma, and Hotkeys with a question mark', () => {
    expect(action(',')).toEqual({ type: 'open', path: '/preferences' })
    expect(action('?')).toEqual({ type: 'open', path: '/hotkeys' })
  })

  it('opens an app by its own letter, in either case', () => {
    expect(action('W')).toEqual({ type: 'open', path: '/work' })
    expect(action('w')).toEqual({ type: 'open', path: '/work' })
    expect(keyAction(press('w'), [], true, desk)).toBeNull()
  })

  it('leaves the keys the browser owns, and takes none with Alt', () => {
    for (const key of ['w', 'm', 'f', 'n', '1', 's']) {
      expect(action(key, { metaKey: true })).toBeNull()
      expect(action(key, { ctrlKey: true })).toBeNull()
    }
    expect(action('k', { altKey: true, metaKey: true })).toBeNull()
    expect(action('m', { altKey: true })).toBeNull()
    expect(action('F11')).toBeNull()
  })

  it('with single keys off, keeps only ⌘K or Ctrl K and Esc', () => {
    for (const key of ['?', ',', 'w', 'm', 'f', 'n']) expect(action(key, {}, false)).toBeNull()
    expect(action('k', { metaKey: true }, false)).toBe('search')
    expect(action('k', { ctrlKey: true }, false)).toBe('search')
    expect(action('Escape', {}, false)).toEqual({ type: 'escape' })
  })

  it('in a field, takes only ⌘K or Ctrl K, and leaves Ctrl K to the field on an Apple device', () => {
    for (const single of [true, false]) {
      for (const one of ['f', 'm', 'n', 'w', 'W', '?', ',', 'Escape'])
        expect(action(one, { target: field }, single)).toBeNull()
      expect(action('m', { ctrlKey: true, target: field }, single)).toBeNull()
      expect(action('k', { ctrlKey: true, target: field }, single)).toBe('search')
      expect(action('k', { metaKey: true, target: field }, single)).toBe('search')
      expect(
        keyAction(press('k', { metaKey: true, target: field }), apps, single, desk, true),
      ).toBe('search')
      expect(
        keyAction(press('k', { ctrlKey: true, target: field }), apps, single, desk, true),
      ).toBeNull()
    }
    expect(action('k', { ctrlKey: true, isComposing: true, target: field })).toBeNull()
  })

  it('takes nothing while a word is being composed', () => {
    expect(action('m', { isComposing: true })).toBeNull()
  })

  it('asks no full screen of a phone, where Esc puts the drawer away', () => {
    const phone = home(390, 796)
    expect(action('f', {}, true, phone)).toBeNull()
    expect(action('Escape', {}, true, phone)).toEqual({ type: 'minimise' })
  })
})
