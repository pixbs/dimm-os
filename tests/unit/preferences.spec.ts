import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WindowView } from '@/data/views'
import { apply, change, settings } from '@/ds/atoms/settings'
import { turned } from '@/ds/molecules/Dial'
import { Lamps } from '@/ds/molecules/Lamps'
import { type Action, manager, start } from '@/shell/manager'

// A device as the head script finds it: what it asks for, and a storage that may refuse.
function device(asks: string[] = [], blocked = false) {
  const kept = new Map<string, string>()
  const refuse = () => {
    throw new Error('blocked')
  }
  const root = { dataset: {} as Record<string, string> }
  vi.stubGlobal('document', { documentElement: root })
  vi.stubGlobal('navigator', { platform: 'MacIntel' })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: asks.some((one) => query.includes(one)),
  }))
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => (blocked ? refuse() : (kept.get(name) ?? null)),
    setItem: (name: string, value: string) => (blocked ? refuse() : kept.set(name, value)),
    removeItem: (name: string) => (blocked ? refuse() : kept.delete(name)),
  })
  return { kept, root: root.dataset }
}

const view = (path: string): WindowView => ({
  path,
  frame: { title: path, kind: null, tile: null },
  sections: [],
  actions: [],
  count: 0,
  parent: null,
  counters: null,
  neighbours: { previous: null, next: null },
})

beforeEach(() => vi.unstubAllGlobals())

describe('Preferences', () => {
  it('starts on the system, and writes nothing before a setting is changed', () => {
    const { kept, root } = device(['prefers-color-scheme: light'])
    apply()
    expect(root).toMatchObject({
      theme: 'light',
      pitch: '8',
      wallpaper: '299',
      hand: 'dots',
      boot: 'on',
      start: 'on',
      remember: 'off',
      clock: 'site',
    })
    expect(kept.size).toBe(0)
  })

  it('writes a setting as a plain value, which the next page applies before it paints', () => {
    const { kept, root } = device()
    change({ theme: 'light', pitch: '12', hand: 'squares' })
    expect(root).toMatchObject({ theme: 'light', pitch: '12', hand: 'squares' })
    expect(Object.fromEntries(kept)).toEqual({ theme: 'light', pitch: '12', hand: 'squares' })

    for (const name of Object.keys(root)) delete root[name]
    apply()
    expect(root).toMatchObject({ theme: 'light', pitch: '12', hand: 'squares' })
  })

  it('changes the screen for this page where storage is blocked', () => {
    const { root } = device([], true)
    expect(() => change({ pitch: '5', remember: 'on' })).not.toThrow()
    expect(root).toMatchObject({ pitch: '5', remember: 'on' })
    change({ theme: 'light' })
    expect(root).toMatchObject({ pitch: '5', theme: 'light' })
    change(Object.fromEntries(settings.map((name) => [name, null])))
    expect(root).toMatchObject({ pitch: '8', theme: 'dark', remember: 'off' })
  })

  it('resets every setting to what the device asks for', () => {
    const { kept, root } = device(['prefers-reduced-motion: reduce'])
    change({ pitch: '10', theme: 'light', wallpaper: '700', boot: 'on', remember: 'on' })
    change(Object.fromEntries(settings.map((name) => [name, null])))
    expect(kept.size).toBe(0)
    expect(root).toMatchObject({ pitch: '8', theme: 'dark', wallpaper: '299', boot: 'off' })
  })

  it('turns the dial: east is a quarter of the range, and a drag past the top holds at the end', () => {
    expect(Math.round(100 + turned(1, 0, null) * 899)).toBe(325)
    // Clockwise past the top from near the end, and back past it from near the start.
    expect(turned(0.1, 1, 0.97)).toBe(1)
    expect(turned(-0.1, 1, 1)).toBeCloseTo(0.984, 2)
    expect(turned(-0.1, 1, 0.02)).toBe(0)
    expect(turned(0.1, 1, 0)).toBeCloseTo(0.016, 2)
  })

  it('shows the time in lamps', () => {
    const lamps = renderToStaticMarkup(createElement(Lamps, { time: '16:44' }))
    expect(lamps.match(/<i /g)).toHaveLength(175)
    expect(lamps.match(/data-lamp="on"/g)).toHaveLength(55)
  })

  it('keeps remembered windows in the taskbar where they stood, their views unloaded', () => {
    const box = { x: 320, y: 96, w: 640, h: 400 }
    const desk: Action[] = [
      { type: 'desk', w: 1440, h: 820 },
      { type: 'remember', windows: [{ at: '/work/one', box }] },
    ]
    const after = desk.reduce(manager, start(view('/welcome')))
    const work = after.open.find((one) => one.path === '/work')!
    expect(work).toMatchObject({ at: '/work/one', mode: 'min', view: null, box, placed: true })
    expect(after.z).toEqual(['/work', '/welcome'])

    const back = manager(after, { type: 'open', path: '/work/one' })
    expect(back.open.find((one) => one.path === '/work')).toMatchObject({ mode: 'float', box })
    const filled = manager(back, { type: 'fill', window: view('/work/one') })
    expect(filled.open.find((one) => one.path === '/work')).toMatchObject({ box })
  })

  it('opens a remembered window that opens at start where it stood', () => {
    const box = { x: 320, y: 96, w: 640, h: 400 }
    const desk: Action[] = [
      { type: 'remember', windows: [{ at: '/welcome', box }] },
      { type: 'start', windows: [view('/welcome')] },
      { type: 'desk', w: 1440, h: 820 },
    ]
    const after = desk.reduce(manager, start(null))
    expect(after.open).toMatchObject([
      { path: '/welcome', mode: 'float', box, view: { path: '/welcome' } },
    ])
    expect(after.z).toEqual(['/welcome'])
  })
})
