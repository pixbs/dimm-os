import type { WindowView } from '@/data/views'
import type { Box, Edge } from '@/ds/organisms/Window'

type Size = Pick<Box, 'w' | 'h'>

type Entry = {
  path: string
  // Null while its view is on the way.
  view: WindowView | null
  // What opened it, where that is an element; a window the page came with has none.
  opener?: Element | null
  // Floating on the desk, taking the whole desk, or put away in the taskbar, and what it comes back as.
  mode: 'float' | 'full' | 'min'
  was: 'float' | 'full'
  // Its size is a maximum, and its place is given once the desk is measured.
  box: Box
  placed: boolean
}

export type Windows = {
  // In the order they opened, which is their order in the page: coming forward moves no element.
  open: Entry[]
  // Their paths, back to front.
  z: string[]
  desk: Size | null
  // The window whose edge is held, which shows its size.
  sizing: string | null
}

export type Action =
  | ({ type: 'desk' } & Size)
  // It opens at once, in front, and its view follows; alone, it closes the ones before.
  | { type: 'open'; path: string; opener?: Element | null; alone?: boolean }
  | { type: 'fill'; window: WindowView }
  // Windows of an earlier load, back to front, go behind the ones already open.
  | { type: 'restore'; windows: WindowView[] }
  | { type: 'focus' | 'close' | 'task' | 'hold'; path: string }
  // Without a path these act on the window in front, as a key or a menu does.
  | { type: 'minimise' | 'full'; path?: string }
  | { type: 'next' | 'escape' }
  | { type: 'move'; path: string; dx: number; dy: number }
  | { type: 'pull'; path: string; edge: Edge; dx: number; dy: number }
  // An arrow key on the bar: one step of a move, or with Shift of a pull.
  | { type: 'step'; path: string; x: number; y: number; pull: boolean }
  | { type: 'put'; where: 'left' | 'right' | 'fill' | 'centre' }

// A move and a size go in steps of 8, a window is never under 360 × 200, and 80 px of it stay on the desk.
const STEP = 8
const MIN = { w: 360, h: 200 }
const REACH = 80
// Until a window brings its own size, and how far each new one stands from the one before.
const SIZE = { w: 720, h: 480 }
const CASCADE = 24
// Under 600 px a screen is compact: its windows lie in the page, so none has a place to be moved from.
const COMPACT = 600

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const snap = (value: number) => Math.round(value / STEP) * STEP

// A stored size is a maximum, and a window never leaves the desk: its bar stays under the top.
function fit({ x, y, w, h }: Box, desk: Size): Box {
  const width = Math.min(w, desk.w)
  return {
    x: clamp(x, REACH - width, desk.w - REACH),
    y: clamp(y, 0, desk.h - REACH),
    w: width,
    h: Math.min(h, desk.h),
  }
}

function pulled(box: Box, edge: Edge, dx: number, dy: number, desk: Size): Box {
  let { x, y, w, h } = box
  const wide = (to: number) => clamp(snap(to), MIN.w, desk.w)
  const high = (to: number) => clamp(snap(to), MIN.h, desk.h)
  if (edge.includes('e')) w = wide(box.w + dx)
  if (edge.includes('s')) h = high(box.h + dy)
  // The edge across from the one pulled stays where it is.
  if (edge.includes('w')) {
    w = wide(box.w - dx)
    x = box.x + box.w - w
  }
  if (edge.includes('n')) {
    h = high(box.h - dy)
    // The top edge stops at the top of the desk.
    if (box.y + box.h < h) h = Math.max(MIN.h, Math.floor((box.y + box.h) / STEP) * STEP)
    y = box.y + box.h - h
  }
  return { x, y, w, h }
}

// A window that has no place yet stands in the middle of the desk, a step further for each one before it.
function placed(state: Windows): Windows {
  const { desk } = state
  if (!desk) return state

  const open = state.open.map((entry, nth) => {
    if (entry.placed) return entry
    const { w, h } = fit(entry.box, desk)
    const middle = (room: number) => clamp(Math.round(room / 2) + nth * CASCADE, 0, room)
    return {
      ...entry,
      placed: true,
      box: { ...entry.box, x: middle(desk.w - w), y: middle(desk.h - h) },
    }
  })
  return { ...state, open }
}

const entry = (path: string, view: WindowView | null, opener?: Element | null): Entry => ({
  path,
  view,
  opener,
  mode: 'float',
  was: 'float',
  box: { x: 0, y: 0, ...SIZE },
  placed: false,
})

export const start = (window: WindowView | null): Windows => ({
  open: window ? [entry(window.path, window)] : [],
  z: window ? [window.path] : [],
  desk: null,
  sizing: null,
})

const find = (state: Windows, path?: string) => state.open.find((entry) => entry.path === path)

const onDesk = (state: Windows) => state.z.filter((path) => find(state, path)?.mode !== 'min')

// The window in front is the last on the desk: one in the taskbar is behind them all.
export const front = (state: Windows): string | undefined => onDesk(state).at(-1)

// Until the desk is measured, and under 600 px, its windows lie in the page.
export const compact = (state: Windows) => !state.desk || state.desk.w < COMPACT

// What a window shows: its size, the desk's at most, and its place once the desk is measured.
export function shown(state: Windows, path: string): Box | Size {
  const found = find(state, path)!
  if (!state.desk || compact(state) || !found.placed) return { w: found.box.w, h: found.box.h }
  return found.mode === 'full' ? { x: 0, y: 0, ...state.desk } : fit(found.box, state.desk)
}

export function manager(state: Windows, action: Action): Windows {
  const change = (path: string, to: Partial<Entry>, z = state.z): Windows => ({
    ...state,
    open: state.open.map((entry) => (entry.path === path ? { ...entry, ...to } : entry)),
    z,
  })
  const others = (path: string) => state.z.filter((other) => other !== path)
  // What an action without a path acts on, and the window an action names when it floats.
  const target = find(state, 'path' in action && action.path ? action.path : front(state))
  const floats = target?.mode === 'float' && state.desk && state.desk.w >= COMPACT && target.placed
  const sized = floats && !target.view?.frame.oneSize

  switch (action.type) {
    case 'desk': {
      const desk = { w: action.w, h: action.h }
      const before = state.desk
      if (before?.w === desk.w && before.h === desk.h) return state
      // A window that stood inside the desk stays inside it when the desk shrinks.
      const kept = (at: number, size: number, room: number, left: number) =>
        at >= 0 && at + size <= room ? clamp(at, 0, left) : at
      const open = state.open.map((one) => {
        if (!before || !one.placed) return one
        const was = fit(one.box, before)
        const now = fit(one.box, desk)
        const x = kept(was.x, was.w, before.w, desk.w - now.w)
        const y = kept(was.y, was.h, before.h, desk.h - now.h)
        return { ...one, box: { ...one.box, x, y } }
      })
      return placed({ ...state, open, desk })
    }
    case 'open': {
      const { path, opener = null, alone } = action
      // An open window comes forward where it stands in the page, back from the taskbar as what it was.
      const open = target
        ? state.open.map((one) =>
            one === target ? { ...one, mode: one.mode === 'min' ? one.was : one.mode } : one,
          )
        : [...state.open, entry(path, null, opener)]
      return placed({
        ...state,
        open: alone ? open.filter((one) => one.path === path) : open,
        z: alone ? [path] : [...others(path), path],
      })
    }
    case 'fill':
      return change(action.window.path, { view: action.window })
    case 'restore': {
      const added = action.windows.filter((window) => !find(state, window.path))
      return placed({
        ...state,
        open: [...state.open, ...added.map((window) => entry(window.path, window))],
        z: [...added.map((window) => window.path), ...state.z],
      })
    }
    case 'focus':
      if (!target || front(state) === action.path) return state
      return change(action.path, {}, [...others(action.path), action.path])
    case 'close':
      return {
        ...state,
        open: state.open.filter((one) => one !== target),
        z: others(action.path),
        sizing: null,
      }
    case 'minimise': {
      // With nothing in front, the window put away last comes back.
      const last = state.z.find((path) => find(state, path)?.mode === 'min')
      if (!target) return last ? manager(state, { type: 'open', path: last }) : state
      if (target.mode === 'min') return state
      return change(target.path, { mode: 'min', was: target.mode }, [
        target.path,
        ...others(target.path),
      ])
    }
    case 'full':
      if (!target || target.mode === 'min' || target.view?.frame.oneSize) return state
      return change(target.path, { mode: target.mode === 'full' ? 'float' : 'full' }, [
        ...others(target.path),
        target.path,
      ])
    // The button of the window in front puts it away; any other brings its window back or forward.
    case 'task':
      return manager(state, {
        type: front(state) === action.path ? 'minimise' : 'open',
        path: action.path,
      })
    case 'next': {
      const top = front(state)
      return top && onDesk(state).length > 1 ? { ...state, z: [top, ...others(top)] } : state
    }
    // Esc leaves full screen first, then closes the window in front.
    case 'escape':
      if (!target) return state
      return manager(state, { type: target.mode === 'full' ? 'full' : 'close', path: target.path })
    case 'hold':
      return {
        ...change(action.path, {}, [...others(action.path), action.path]),
        sizing: action.path,
      }
    case 'move': {
      if (!floats) return state
      const from = fit(target.box, state.desk!)
      const box = fit(
        { ...from, x: Math.round(from.x + action.dx), y: Math.round(from.y + action.dy) },
        state.desk!,
      )
      return change(action.path, { box }, [...others(action.path), action.path])
    }
    case 'pull': {
      if (!sized) return { ...state, sizing: null }
      const box = pulled(
        fit(target.box, state.desk!),
        action.edge,
        action.dx,
        action.dy,
        state.desk!,
      )
      return {
        ...change(action.path, { box }, [...others(action.path), action.path]),
        sizing: null,
      }
    }
    case 'step': {
      const { path, x, y } = action
      return manager(
        state,
        action.pull
          ? { type: 'pull', path, edge: 'se', dx: x * STEP, dy: y * STEP }
          : { type: 'move', path, dx: x * STEP, dy: y * STEP },
      )
    }
    case 'put': {
      const { desk } = state
      if (!target || !desk || !target.placed) return state
      const half = Math.max(MIN.w, Math.ceil(desk.w / 2))
      const { w, h } = fit(target.box, desk)
      const box = {
        left: { x: 0, y: 0, w: half, h: desk.h },
        right: { x: desk.w - half, y: 0, w: half, h: desk.h },
        fill: { x: 0, y: 0, ...desk },
        centre: { x: Math.round((desk.w - w) / 2), y: Math.round((desk.h - h) / 2), w, h },
      }[action.where]
      // A window of one size can only be centred.
      if (target.view?.frame.oneSize && action.where !== 'centre') return state
      return change(target.path, { box, mode: 'float' })
    }
  }
}
