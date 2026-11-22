import { describe, expect, it } from 'vitest'

import type { WindowView } from '@/data/views'
import type { Box } from '@/ds/organisms/Window'
import {
  type Action,
  front,
  manager,
  phone,
  showing,
  shown,
  stack,
  start,
  type Windows,
} from '@/shell/manager'

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

const after = (state: Windows, ...actions: Action[]) => actions.reduce(manager, state)
const paths = (state: Windows) => state.open.map((window) => window.path)
const mode = (state: Windows, path: string) =>
  state.open.find((window) => window.path === path)?.mode
const box = (state: Windows, path: string) => shown(state, path) as Box

// The desk of the reference: welcome in front of work, with room around both.
const home = () =>
  after(
    start(view('/welcome')),
    { type: 'desk', w: 1440, h: 820 },
    { type: 'open', path: '/work' },
    { type: 'fill', window: view('/work') },
    { type: 'focus', path: '/welcome' },
  )

describe('the window manager', () => {
  it('starts with the window of the view, or with none', () => {
    expect(paths(start(null))).toEqual([])
    expect(front(start(view('/a')))).toBe('/a')
  })

  it('opens a window at once, in front, and fills it when its view arrives', () => {
    const waiting = after(start(view('/a')), { type: 'open', path: '/b' })
    expect(paths(waiting)).toEqual(['/a', '/b'])
    expect(front(waiting)).toBe('/b')
    expect(waiting.open[1].view).toBeNull()

    const filled = after(
      waiting,
      { type: 'focus', path: '/a' },
      { type: 'fill', window: view('/b') },
    )
    expect(filled.open[1].view?.path).toBe('/b')
    expect(front(filled)).toBe('/a')
  })

  it('brings an open window forward where it stands in the page', () => {
    const state = after(
      start(view('/a')),
      { type: 'open', path: '/b' },
      { type: 'open', path: '/a' },
    )

    expect(paths(state)).toEqual(['/a', '/b'])
    expect(state.z).toEqual(['/b', '/a'])
  })

  it('focuses an open window, and changes nothing for the front one or one that is not open', () => {
    const state = after(
      start(view('/a')),
      { type: 'open', path: '/b' },
      { type: 'focus', path: '/a' },
    )

    expect(front(state)).toBe('/a')
    expect(manager(state, { type: 'focus', path: '/a' })).toBe(state)
    expect(manager(state, { type: 'focus', path: '/c' })).toBe(state)
  })

  it("shows an item in its parent's window, keeping the view before until its own arrives", () => {
    const state = after(start(view('/work')), { type: 'open', path: '/work/grow' })

    expect(paths(state)).toEqual(['/work'])
    expect(showing(state)).toBe('/work/grow')
    expect(state.open[0]).toMatchObject({ view: { path: '/work' } })
    // A view that comes after its window went elsewhere is not shown.
    expect(after(state, { type: 'fill', window: view('/work') }).open[0].view?.path).toBe('/work')

    const grow = after(state, { type: 'fill', window: view('/work/grow') })
    expect(grow.open[0].view?.path).toBe('/work/grow')
    // Back from the taskbar, a window shows what it showed.
    expect(showing(after(grow, { type: 'minimise' }, { type: 'task', path: '/work' }))).toBe(
      '/work/grow',
    )
  })

  it('opens the windows marked to open at start with the measured desk, the first in front', () => {
    const windows = [view('/welcome'), view('/work')]
    const desk = after(start(null), { type: 'start', windows }, { type: 'desk', w: 1440, h: 820 })

    expect(paths(desk)).toEqual(['/welcome', '/work'])
    expect(front(desk)).toBe('/welcome')
    // On a phone only the first opens, measured before or after.
    for (const actions of [
      [
        { type: 'start', windows },
        { type: 'desk', w: 390, h: 796 },
      ],
      [
        { type: 'desk', w: 390, h: 796 },
        { type: 'start', windows },
      ],
    ] as Action[][]) {
      expect(paths(after(start(null), ...actions))).toEqual(['/welcome'])
    }
  })

  it('restores windows behind the open ones, once each', () => {
    const state = manager(start(view('/c')), {
      type: 'restore',
      windows: [view('/a'), view('/b'), view('/c')],
    })

    expect(paths(state)).toEqual(['/c', '/a', '/b'])
    expect(state.z).toEqual(['/a', '/b', '/c'])
  })

  it('opens a window inside the desk at its stored size at most, and clamps it when the desk shrinks', () => {
    const state = home()
    for (const path of paths(state)) {
      const { x, y, w, h } = box(state, path)
      expect([w, h]).toEqual([720, 480])
      expect(x >= 0 && y >= 0 && x + w <= 1440 && y + h <= 820).toBe(true)
    }
    // Each new window stands a step from the one before, so neither hides the other.
    expect(box(state, '/work').x).toBe(box(state, '/welcome').x + 24)

    const small = manager(state, { type: 'desk', w: 640, h: 400 })
    expect(box(small, '/welcome')).toEqual({ x: 0, y: 0, w: 640, h: 400 })
    expect(box(manager(small, { type: 'desk', w: 1440, h: 820 }), '/welcome').w).toBe(720)
  })

  it('opens a window at the size its view asks for, beside the apps and at the room there at most', () => {
    const sized = (path: string, w: number, h: number): WindowView => ({
      ...view(path),
      frame: { ...view(path).frame, size: { w, h } },
    })
    const tablet = after(start(sized('/cv', 800, 1114)), {
      type: 'desk',
      w: 834,
      h: 1098,
      room: { x: 112, w: 698 },
    })
    expect(box(tablet, '/cv')).toEqual({ x: 112, y: 0, w: 698, h: 1098 })

    // A view that arrives once its window is open brings its size, about the same middle.
    const opened = after(tablet, { type: 'open', path: '/contact' })
    const before = box(opened, '/contact')
    const filled = box(
      after(opened, { type: 'fill', window: sized('/contact', 640, 512) }),
      '/contact',
    )
    expect([filled.w, filled.h]).toEqual([640, 512])
    expect(filled.x + filled.w / 2).toBe(before.x + before.w / 2)
    expect(filled.y + filled.h / 2).toBe(before.y + before.h / 2)

    // Once the visitor has sized it, the size is theirs.
    const pulled = after(opened, { type: 'pull', path: '/contact', edge: 'se', dx: 80, dy: 0 })
    const kept = after(pulled, { type: 'fill', window: sized('/contact', 640, 512) })
    expect(box(kept, '/contact')).toEqual(box(pulled, '/contact'))
    // So is the half of the desk it was put on.
    const put = after(opened, { type: 'put', where: 'left' })
    const filled2 = after(put, { type: 'fill', window: sized('/contact', 640, 512) })
    expect(box(filled2, '/contact')).toEqual(box(put, '/contact'))
  })

  it('keeps a window its own size on a phone, where the room beside the apps is none', () => {
    const cv: WindowView = {
      ...view('/cv'),
      frame: { ...view('/cv').frame, size: { w: 800, h: 600 } },
    }
    const phone = after(start(cv), { type: 'desk', w: 390, h: 760, room: { x: 378, w: 0 } })
    const wide = after(phone, { type: 'desk', w: 1280, h: 800, room: { x: 112, w: 1144 } })
    expect(box(wide, '/cv')).toMatchObject({ w: 800, h: 600 })
  })

  it('takes the size of a view that arrives before the desk is measured', () => {
    const early = after(start(null), { type: 'open', path: '/cv' })
    const cv: WindowView = {
      ...view('/cv'),
      frame: { ...view('/cv').frame, size: { w: 800, h: 600 } },
    }
    const measured = after(early, { type: 'fill', window: cv }, { type: 'desk', w: 1440, h: 820 })
    expect(box(measured, '/cv')).toMatchObject({ w: 800, h: 600 })
  })

  it('never lets a window leave the desk: 80 px stay in reach, and its bar under the top', () => {
    const far = (dx: number, dy: number) =>
      box(manager(home(), { type: 'move', path: '/work', dx, dy }), '/work')

    expect(far(-5000, -5000)).toMatchObject({ x: 80 - 720, y: 0 })
    expect(far(5000, 5000)).toMatchObject({ x: 1440 - 80, y: 820 - 80 })
    const pulled = box(
      manager(home(), { type: 'pull', path: '/work', edge: 'nw', dx: -5000, dy: -5000 }),
      '/work',
    )
    // The top edge stops within a step of the top, and no size is larger than the desk.
    expect(pulled.y >= 0 && pulled.y < 8).toBe(true)
    expect(pulled.w).toBe(1440)
  })

  it('opens a window behind the one in front: beside it where the room has space, else covered', () => {
    const wide = after(start(view('/accessibility')), {
      type: 'desk',
      w: 1920,
      h: 1000,
      room: { x: 112, w: 1784 },
    })
    const beside = after(wide, { type: 'open', path: '/cookies', behind: true })
    expect(beside.z).toEqual(['/cookies', '/accessibility'])
    expect(front(beside)).toBe('/accessibility')
    const own = box(beside, '/accessibility')
    const asked = box(beside, '/cookies')
    expect(asked.x).toBe(112 + 1784 - 440)
    expect(asked.x).toBeGreaterThanOrEqual(own.x + own.w)

    const narrow = after(
      start(view('/accessibility')),
      { type: 'desk', w: 1440, h: 820, room: { x: 112, w: 1304 } },
      { type: 'open', path: '/cookies', behind: true },
    )
    expect(front(narrow)).toBe('/accessibility')
    expect(narrow.open.find((one) => one.path === '/cookies')?.covered).toBe(true)

    // On a phone the drawer is the one behind; with no window in front it opens in front.
    const drawer = after(
      start(view('/accessibility')),
      { type: 'desk', w: 390, h: 760 },
      { type: 'open', path: '/cookies', behind: true },
    )
    expect(stack(drawer)).toEqual(['/cookies', '/accessibility'])
    const empty = after(start(null), { type: 'open', path: '/cookies', behind: true })
    expect(front(empty)).toBe('/cookies')
  })

  it('opens one window at a time when asked, closing the ones before', () => {
    const state = after(home(), { type: 'open', path: '/cv', alone: true })

    expect(paths(state)).toEqual(['/cv'])
    expect(state.z).toEqual(['/cv'])
  })

  it('switched to one window at a time, keeps the one in front alone, back where nothing was dragged', () => {
    const before = after(
      home(),
      { type: 'open', path: '/cv' },
      { type: 'minimise', path: '/work' },
      { type: 'move', path: '/cv', dx: 200, dy: 90 },
    )
    const state = after(before, { type: 'alone' })

    expect(paths(state)).toEqual(['/cv'])
    expect(state.z).toEqual(['/cv'])
    expect(box(state, '/cv')).toEqual(
      box(
        after(start(null), { type: 'desk', w: 1440, h: 820 }, { type: 'open', path: '/cv' }),
        '/cv',
      ),
    )
  })

  it('answers the four commands of the Window menu: left half, right half, fill, centre', () => {
    const put = (where: 'left' | 'right' | 'fill' | 'centre', state = home()) =>
      box(manager(state, { type: 'put', where }), '/welcome')

    expect(put('left')).toEqual({ x: 0, y: 0, w: 720, h: 820 })
    expect(put('right')).toEqual({ x: 720, y: 0, w: 720, h: 820 })
    expect(put('fill')).toEqual({ x: 0, y: 0, w: 1440, h: 820 })
    const moved = manager(home(), { type: 'move', path: '/welcome', dx: -200, dy: 90 })
    expect(put('centre', moved)).toEqual({ x: 360, y: 170, w: 720, h: 480 })
    // A window in full screen comes out of it; one of one size can only be centred.
    const full = manager(home(), { type: 'full' })
    expect(mode(manager(full, { type: 'put', where: 'left' }), '/welcome')).toBe('float')
    const fixed = after(home(), { type: 'fill', window: view('/welcome', true) })
    expect(put('fill', fixed)).toEqual(box(fixed, '/welcome'))
  })
})

// The checks of the handoff's reference that concern windows, in its order and by its names.
describe('the commands for all windows', () => {
  it('minimise all puts every window on the desk away, and the one in front comes back first', () => {
    const away = after(home(), { type: 'minimiseAll' })
    expect([mode(away, '/welcome'), mode(away, '/work')]).toEqual(['min', 'min'])
    expect(front(away)).toBeUndefined()
    expect(front(after(away, { type: 'minimise' }))).toBe('/welcome')
  })

  it('close all closes every window, those in the taskbar too', () => {
    const closed = after(home(), { type: 'minimise' }, { type: 'closeAll' })
    expect(paths(closed)).toEqual([])
    expect(closed.z).toEqual([])
  })
})

describe('the window manager, as the reference checks it', () => {
  let desk = home()
  const act = (...actions: Action[]) => (desk = after(desk, ...actions))

  it('front is welcome', () => {
    expect(front(desk)).toBe('/welcome')
  })

  it('drag moves and fronts', () => {
    const from = box(desk, '/work')
    act({ type: 'move', path: '/work', dx: 40, dy: 30 })

    expect(box(desk, '/work')).toEqual({ ...from, x: from.x + 40, y: from.y + 30 })
    expect(front(desk)).toBe('/work')
  })

  it('sizing shows the size', () => {
    act({ type: 'focus', path: '/welcome' }, { type: 'hold', path: '/work' })

    expect(desk.sizing).toBe('/work')
    expect(front(desk)).toBe('/work')
  })

  it('pull the corner in steps of 8', () => {
    act({ type: 'pull', path: '/work', edge: 'se', dx: 37, dy: 21 })

    expect(box(desk, '/work')).toMatchObject({ w: 760, h: 504 })
    expect(desk.sizing).toBeNull()
  })

  it('pull the west edge: the east edge stays', () => {
    const { x, w } = box(desk, '/work')
    act({ type: 'pull', path: '/work', edge: 'w', dx: -16, dy: 0 })

    expect(box(desk, '/work').w).toBe(w + 16)
    expect(box(desk, '/work').x + box(desk, '/work').w).toBe(x + w)
  })

  it('minimise: off the desk, in the taskbar, hollow mark', () => {
    act({ type: 'minimise', path: '/work' })

    expect(mode(desk, '/work')).toBe('min')
    expect(paths(desk)).toContain('/work')
    expect(front(desk)).toBe('/welcome')
  })

  it('its button brings it back, to the front', () => {
    act({ type: 'task', path: '/work' })

    expect(mode(desk, '/work')).toBe('float')
    expect(front(desk)).toBe('/work')
  })

  it('the button of the window in front minimises it', () => {
    act({ type: 'task', path: '/work' })

    expect(mode(desk, '/work')).toBe('min')
    expect(paths(desk)).toContain('/work')
  })

  it('full screen takes the desk', () => {
    act({ type: 'task', path: '/work' }, { type: 'full', path: '/work' })

    expect(mode(desk, '/work')).toBe('full')
    expect(box(desk, '/work')).toEqual({ x: 0, y: 0, w: 1440, h: 820 })
  })

  it('a full window comes back full', () => {
    act({ type: 'minimise', path: '/work' }, { type: 'task', path: '/work' })

    expect(mode(desk, '/work')).toBe('full')
  })

  it('Esc leaves full screen first', () => {
    act({ type: 'escape' })

    expect(mode(desk, '/work')).toBe('float')
  })

  it('Esc then closes: out of the taskbar', () => {
    act({ type: 'escape' })

    expect(paths(desk)).toEqual(['/welcome'])
    expect(front(desk)).toBe('/welcome')
  })

  it('a window of one size has no full screen', () => {
    act(
      { type: 'open', path: '/work' },
      { type: 'open', path: '/hotkeys' },
      { type: 'fill', window: view('/hotkeys', true) },
      { type: 'full', path: '/hotkeys' },
    )

    expect(mode(desk, '/hotkeys')).toBe('float')
  })

  it('N goes to the next window', () => {
    act({ type: 'next' })

    expect(front(desk)).toBe('/work')
  })

  it('M minimises one after another', () => {
    act({ type: 'minimise' }, { type: 'minimise' }, { type: 'minimise' })

    expect(desk.open.map((window) => window.mode)).toEqual(['min', 'min', 'min'])
    expect(front(desk)).toBeUndefined()
  })

  it('M with nothing in front brings the last one back', () => {
    act({ type: 'minimise' })

    expect(front(desk)).toBe('/hotkeys')
  })

  it('arrows move a window by its bar', () => {
    const { x } = box(desk, '/hotkeys')
    act({ type: 'step', path: '/hotkeys', x: 1, y: 0, pull: false })

    expect(box(desk, '/hotkeys').x).toBe(x + 8)
  })

  it('a window of one size is not resized by keys', () => {
    const { w } = box(desk, '/hotkeys')
    act({ type: 'step', path: '/hotkeys', x: 1, y: 0, pull: true })
    expect(box(desk, '/hotkeys').w).toBe(w)

    act({ type: 'task', path: '/work' }, { type: 'step', path: '/work', x: 1, y: 1, pull: true })
    expect(box(desk, '/work')).toMatchObject({ w: 728, h: 488 })
  })
})

// The checks of the handoff's reference that concern drawers: a phone's home opens with the welcome drawer.
describe('the drawers of a phone, as the reference checks them', () => {
  let desk = after(start(view('/welcome')), { type: 'desk', w: 390, h: 796 })
  const act = (...actions: Action[]) => (desk = after(desk, ...actions))

  it('phone home: the welcome drawer', () => {
    expect(phone(desk)).toBe(true)
    expect(stack(desk)).toEqual(['/welcome'])
  })

  it('closes by its handle', () => {
    // The handle puts the drawer away; its button in the dock brings it back.
    act({ type: 'minimise', path: '/welcome' })
    expect(stack(desk)).toEqual([])
    expect(mode(desk, '/welcome')).toBe('min')

    act({ type: 'task', path: '/welcome' })
    expect(stack(desk)).toEqual(['/welcome'])
  })
})

describe('the drawers of a phone', () => {
  it('are drawers only once the desk is measured under 600 px', () => {
    expect(phone(start(view('/a')))).toBe(false)
    expect(phone(after(start(view('/a')), { type: 'desk', w: 600, h: 800 }))).toBe(false)
    expect(phone(after(start(view('/a')), { type: 'desk', w: 599, h: 800 }))).toBe(true)
  })

  it('stand three deep at most, the last opened in front', () => {
    const desk = after(
      start(view('/a')),
      { type: 'desk', w: 390, h: 796 },
      { type: 'open', path: '/b' },
      { type: 'open', path: '/c' },
      { type: 'open', path: '/d' },
    )

    expect(stack(desk)).toEqual(['/b', '/c', '/d'])
    // Putting the one in front away brings the next forward.
    expect(stack(after(desk, { type: 'minimise' }))).toEqual(['/a', '/b', '/c'])
  })

  it('take what brought a window back as its opener, for the focus to return to', () => {
    const [link, button] = [{} as Element, {} as Element]
    const desk = after(
      start(view('/a')),
      { type: 'open', path: '/b', opener: link },
      { type: 'minimise', path: '/b' },
    )
    expect(desk.open[1].opener).toBe(link)

    expect(after(desk, { type: 'task', path: '/b', opener: button }).open[1].opener).toBe(button)
    expect(after(desk, { type: 'open', path: '/b', opener: null }).open[1].opener).toBe(link)
  })
})
