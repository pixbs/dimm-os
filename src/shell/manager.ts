import type { WindowView } from '@/data/views'
import type { Box, Edge } from '@/ds/organisms/Window'
import { oneSize } from '@/system/windows'

type Size = Pick<Box, 'w' | 'h'>

type Entry = {
  // The window, named by the first segment of the path it shows: an item shows in its parent's window.
  path: string
  at: string
  // Null while its view is on the way; until the next arrives, it keeps the one before.
  view: WindowView | null
  // What opened it, where that is an element; a window the page came with has none.
  opener?: Element | null
  // Floating on the desk, taking the whole desk, or put away in the taskbar, and what it comes back as.
  mode: 'float' | 'full' | 'min'
  was: 'float' | 'full'
  // Its size is a maximum, and its place is given once the desk is measured; pulled, the size is the visitor's.
  box: Box
  placed: boolean
  pulled?: boolean
  // Placed a step from the window before it, so its view's size keeps its top corner rather than its middle.
  stacked?: boolean
  // It waits behind the window in front, which covers it: its taskbar button signals it.
  covered?: boolean
}

// Where windows open: the span of the desk beside its apps, and the height of a title bar, a step of the stack.
type Room = { x: number; w: number; bar?: number }

export type Windows = {
  // In the order they opened, which is their order in the page: coming forward moves no element.
  open: Entry[]
  // Their paths, back to front.
  z: string[]
  desk: Size | null
  room: Room | null
  // The window whose edge is held, which shows its size.
  sizing: string | null
  // The windows that open at start wait for the desk to be measured, since a phone opens only the first.
  starting: WindowView[]
}

export type Action =
  | ({ type: 'desk'; room?: Room } & Size)
  // It opens at once, in front, and its view follows; alone, it closes the ones before. Behind, it opens under the
  // window in front, which keeps the front and the focus.
  | { type: 'open'; path: string; opener?: Element | null; alone?: boolean; behind?: boolean }
  | { type: 'fill'; window: WindowView }
  // Windows of an earlier load, back to front, go behind the ones already open.
  | { type: 'restore'; windows: WindowView[] }
  // The windows marked to open at start, the first in front.
  | { type: 'start'; windows: WindowView[] }
  // Where windows stood when windows are remembered: those open then wait in the taskbar, their views unloaded.
  | { type: 'remember'; windows: { at: string; box: Box }[] }
  | { type: 'focus' | 'close' | 'hold'; path: string }
  // A taskbar button: the button is what opened its window when it brings it back.
  | { type: 'task'; path: string; opener?: Element | null }
  // Without a path these act on the window in front, as a key or a menu does.
  | { type: 'minimise' | 'full'; path?: string }
  // "One window at a time" switched on: the window in front stays, alone, where nothing overlaps it.
  | { type: 'next' | 'escape' | 'minimiseAll' | 'closeAll' | 'alone' }
  | { type: 'move'; path: string; dx: number; dy: number }
  | { type: 'pull'; path: string; edge: Edge; dx: number; dy: number }
  // An arrow key on the bar: one step of a move, or with Shift of a pull.
  | { type: 'step'; path: string; x: number; y: number; pull: boolean }
  | { type: 'put'; where: 'left' | 'right' | 'fill' | 'centre'; path?: string }

// A move and a size go in steps of 8, a window is never under 360 × 200, and 80 px of it stay on the desk.
const STEP = 8
const MIN = { w: 360, h: 200 }
const REACH = 80
// Until a window brings its own size, and how far each new one stands from the one before.
const SIZE = { w: 720, h: 480 }
// A title bar under a fine pointer, until the desk says how high its bars are.
const BAR = 32
// Under 600 px a screen is compact: its windows are drawers, so none has a place to be moved from.
const COMPACT = 600
// A stack of three drawers at most: the one in front and two behind it.
const STACK = 3

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

// The size a window's view asks for, or the one it has until its view arrives.
const sizeOf = (view: WindowView | null): Size => ({
  w: view?.frame.size?.w ?? SIZE.w,
  h: view?.frame.size?.h ?? SIZE.h,
})

// Where windows float, the room beside the apps; a phone's drawers have none, and keep their own size for later.
const roomIn = (state: Windows): Room | null =>
  state.desk && !compact(state) ? (state.room ?? { x: 0, w: state.desk.w }) : null

// A window of the stack keeps its top corner, unless it would reach past the room there: then it starts a new row,
// a step in from the room's top corner. One too wide to step aside stands at the room's end and steps down only;
// one too high to step down stands at the room's foot and steps aside only.
function inStack({ x, y, w, h }: Box, room: Room, desk: Size): Pick<Box, 'x' | 'y'> {
  const bar = room.bar ?? BAR
  const end = Math.min(room.x + room.w, desk.w)
  const past = (y + h > desk.h && bar + h <= desk.h) || (x + w > end && room.x + bar + w <= end)
  return {
    x: clamp(past ? room.x + bar : x, 0, Math.max(0, end - w)),
    y: clamp(past ? bar : y, 0, desk.h - h),
  }
}

// A window that has no place yet stands a step to the end and a step down from the window opened last that still
// floats on the desk, where that one stands now; on an empty desk, in the middle of the room beside the apps. Either
// way at the room's width at most. A phone has drawers and no stack.
function placed(state: Windows): Windows {
  const { desk } = state
  if (!desk) return state
  const room = roomIn(state)
  const at = room ?? { x: 0, w: desk.w }

  const open = state.open.reduce<Entry[]>((done, entry) => {
    if (entry.placed) return [...done, entry]
    const kept = { ...entry.box, w: Math.min(entry.box.w, room?.w ?? entry.box.w) }
    const { w, h } = fit(kept, desk)
    const before = room && done.filter((one) => one.placed && one.mode === 'float').at(-1)
    if (before) {
      const step = room.bar ?? BAR
      const { x, y } = fit(before.box, desk)
      const box = { ...kept, ...inStack({ x: x + step, y: y + step, w, h }, room, desk) }
      return [...done, { ...entry, placed: true, stacked: true, box }]
    }
    const box = {
      ...kept,
      x: clamp(at.x + Math.round((at.w - w) / 2), 0, desk.w - w),
      y: clamp(Math.round((desk.h - h) / 2), 0, desk.h - h),
    }
    return [...done, { ...entry, placed: true, stacked: false, box }]
  }, [])
  return { ...state, open }
}

// A window opened behind the one in front stands beside it at the far end of the room, or, where the room has no
// space beside it, behind it and marked; a drawer has no place.
function beside(state: Windows, path: string, under: string): Windows {
  const room = roomIn(state)
  const one = find(state, path)!
  const front = find(state, under)!
  if (!room || !state.desk) return state
  const desk = state.desk
  const { w, h } = fit(one.box, desk)
  const x = room.x + room.w - w
  const ahead = fit(front.box, desk)
  const free = front.mode === 'float' && front.placed && ahead.x + ahead.w <= x
  const to: Partial<Entry> = free
    ? {
        box: { ...one.box, x, y: Math.round((desk.h - h) / 2) },
        placed: true,
        stacked: false,
        covered: false,
      }
    : { covered: true }
  return {
    ...state,
    open: state.open.map((entry) => (entry === one ? { ...entry, ...to } : entry)),
  }
}

// The window of a path: its first segment.
export const windowOf = (path: string) => `/${path.split('/')[1]}`

const entry = (path: string, view: WindowView | null, opener?: Element | null): Entry => ({
  path: windowOf(path),
  at: path,
  view,
  opener,
  mode: 'float',
  was: 'float',
  // A system window keeps its one size before its view arrives.
  box: { x: 0, y: 0, ...(oneSize[path as keyof typeof oneSize] ?? sizeOf(view)) },
  placed: false,
})

export const start = (window: WindowView | null): Windows => ({
  open: window ? [entry(window.path, window)] : [],
  z: window ? [windowOf(window.path)] : [],
  desk: null,
  room: null,
  sizing: null,
  starting: [],
})

const find = (state: Windows, path?: string) =>
  state.open.find((entry) => path && entry.path === windowOf(path))

const onDesk = (state: Windows) => state.z.filter((path) => find(state, path)?.mode !== 'min')

// The window in front is the last on the desk: one in the taskbar is behind them all.
export const front = (state: Windows): string | undefined => onDesk(state).at(-1)

// What the window in front shows, which the address follows: the 404 window shows the address it answers.
export const showing = (state: Windows): string | undefined => {
  const window = find(state, front(state))
  return window?.view?.asked ?? window?.at
}

// Until the desk is measured, and under 600 px, its windows have no place on it.
export const compact = (state: Windows) => !state.desk || state.desk.w < COMPACT

// A desk measured under 600 px is a phone, where every window is a drawer.
export const phone = (state: Windows) => !!state.desk && compact(state)

// The drawers that can be seen, back to front: the windows on the desk, three at most.
export const stack = (state: Windows) => onDesk(state).slice(-STACK)

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
      const room = action.room ?? null
      const before = state.desk
      if (before?.w === desk.w && before.h === desk.h && state.room?.x === room?.x) return state
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
      // A phone has no minimised windows: those put away, or remembered, are closed there.
      const staying = phone({ ...state, desk }) ? open.filter((one) => one.mode !== 'min') : open
      const measured = placed({
        ...state,
        open: staying,
        z: state.z.filter((path) => staying.some((one) => one.path === path)),
        desk,
        room,
      })
      return state.starting.length
        ? manager(measured, { type: 'start', windows: state.starting })
        : measured
    }
    case 'open': {
      const { path, opener = null, alone } = action
      const window = windowOf(path)
      // Behind goes under the window in front, one restored from this tab too; alone, it waits in the taskbar, or on
      // a phone, which has none, as the drawer behind.
      const under = action.behind ? front(state) : undefined
      if (under && under !== window) {
        const waits = alone && !phone(state)
        // It takes no focus, which would bring it forward.
        const asked = { ...(target ?? entry(path, null, undefined)), at: path, covered: alone }
        const kept: Entry = waits
          ? { ...asked, mode: 'min', was: asked.mode === 'min' ? asked.was : asked.mode }
          : { ...asked, mode: asked.mode === 'min' ? asked.was : asked.mode }
        // The window in front takes the focus, as one the visitor opened.
        const open = (
          target ? state.open.map((one) => (one === target ? kept : one)) : [...state.open, kept]
        ).map((one) => (one.path === under ? { ...one, opener: one.opener ?? null } : one))
        const rest = others(window).filter((path) => path !== under)
        const behind = placed({
          ...state,
          open,
          z: waits ? [window, ...rest, under] : [...rest, window, under],
        })
        return waits ? behind : beside(behind, window, under)
      }
      // An open window comes forward where it stands in the page, back from the taskbar as what it was, and
      // what brought it is now its opener; given another path of its own, it goes there.
      const open = target
        ? state.open.map((one) =>
            one === target
              ? {
                  ...one,
                  mode: one.mode === 'min' ? one.was : one.mode,
                  opener: opener ?? one.opener,
                  at: path,
                }
              : one,
          )
        : [...state.open, entry(path, null, opener)]
      // Alone, it closes the others, but not one that waits for an answer.
      const kept = open.filter((one) => one.path === window || one.covered)
      return placed({
        ...state,
        open: alone ? kept : open,
        z: alone
          ? [...kept.map((one) => one.path).filter((one) => one !== window), window]
          : [...others(window), window],
      })
    }
    // A view that comes after its window went elsewhere is not shown.
    case 'fill': {
      const one = find(state, action.window.path)
      if (one?.at !== action.window.path) return state
      if (one.pulled) return change(one.path, { view: action.window })
      // Until the visitor sizes it, the window takes the size its view asks for, about the same middle once placed,
      // or in the stack at the same top corner.
      const asked = sizeOf(action.window)
      const { desk } = state
      if (!desk || !one.placed)
        return change(one.path, { view: action.window, box: { ...one.box, ...asked } })
      const room = roomIn(state)
      const kept = { ...one.box, ...asked, w: Math.min(asked.w, room?.w ?? asked.w) }
      const was = fit(one.box, desk)
      const { w, h } = fit(kept, desk)
      const box =
        one.stacked && room
          ? { ...kept, ...inStack({ x: was.x, y: was.y, w, h }, room, desk) }
          : {
              ...kept,
              x: clamp(was.x + Math.round((was.w - w) / 2), 0, desk.w - w),
              y: clamp(was.y + Math.round((was.h - h) / 2), 0, desk.h - h),
            }
      return change(one.path, { view: action.window, box })
    }
    case 'restore': {
      // One entry a window, though a tab may have kept two paths of it.
      const added = action.windows.filter(
        (window, at, all) =>
          !find(state, window.path) &&
          all.findIndex((one) => windowOf(one.path) === windowOf(window.path)) === at,
      )
      return placed({
        ...state,
        open: [...state.open, ...added.map((window) => entry(window.path, window))],
        z: [...added.map((window) => windowOf(window.path)), ...state.z],
      })
    }
    case 'start': {
      if (!state.desk) return { ...state, starting: action.windows }
      // A window that waits in the taskbar, remembered, opens where it stood.
      const windows = (phone(state) ? action.windows.slice(0, 1) : action.windows).filter(
        (window) => !find(state, window.path)?.view,
      )
      const paths = windows.map((window) => windowOf(window.path))
      const opened = (one: Entry): Entry => {
        const window = windows.find((each) => windowOf(each.path) === one.path)
        return window ? { ...one, at: window.path, view: window, mode: one.was } : one
      }
      return placed({
        ...state,
        starting: [],
        open: [
          ...state.open.map(opened),
          ...windows
            .filter((window) => !find(state, window.path))
            .map((window) => entry(window.path, window)),
        ],
        z: [...state.z.filter((path) => !paths.includes(path)), ...paths.reverse()],
      })
    }
    case 'remember': {
      if (phone(state)) return state
      const box = (path: string) => action.windows.find((one) => windowOf(one.at) === path)?.box
      // A remembered box is the visitor's, which no view's size replaces.
      const kept = (one: Entry): Entry =>
        box(one.path) ? { ...one, box: box(one.path)!, placed: true, pulled: true } : one
      const back = action.windows
        .filter(
          (one, at, all) =>
            !find(state, one.at) &&
            all.findIndex((other) => windowOf(other.at) === windowOf(one.at)) === at,
        )
        .map((one) => kept({ ...entry(one.at, null), mode: 'min' }))
      return {
        ...state,
        open: [...state.open.map(kept), ...back],
        z: [...back.map((one) => one.path), ...state.z],
      }
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
      // On a phone a drawer put away is closed.
      if (phone(state)) return target ? manager(state, { type: 'close', path: target.path }) : state
      // With nothing in front, the window put away last comes back.
      const last = state.open.find(
        (one) => one.path === state.z.find((path) => find(state, path)?.mode === 'min'),
      )
      if (!target) return last ? manager(state, { type: 'open', path: last.at }) : state
      if (target.mode === 'min') return state
      return change(target.path, { mode: 'min', was: target.mode }, [
        target.path,
        ...others(target.path),
      ])
    }
    // Back to front, so the one in front comes back first.
    case 'minimiseAll':
      if (phone(state)) return manager(state, { type: 'closeAll' })
      return onDesk(state).reduce((next, path) => manager(next, { type: 'minimise', path }), state)
    case 'closeAll':
      return { ...state, open: [], z: [], sizing: null }
    case 'alone': {
      const kept = state.open.find((one) => one.path === front(state))
      if (!kept) return manager(state, { type: 'closeAll' })
      const box = kept.view ? { ...kept.box, ...sizeOf(kept.view) } : kept.box
      // A window that waits for an answer stays behind.
      const waiting = state.open.filter((one) => one.covered && one !== kept)
      return placed({
        ...state,
        open: [{ ...kept, placed: false, pulled: false, box }, ...waiting],
        z: [...waiting.map((one) => one.path), kept.path],
        sizing: null,
      })
    }
    case 'full':
      if (!target || target.mode === 'min' || target.view?.frame.oneSize) return state
      return change(target.path, { mode: target.mode === 'full' ? 'float' : 'full' }, [
        ...others(target.path),
        target.path,
      ])
    // The button of the window in front puts it away; any other brings its window back or forward.
    case 'task':
      return front(state) === action.path
        ? manager(state, { type: 'minimise', path: action.path })
        : manager(state, { type: 'open', path: target?.at ?? action.path, opener: action.opener })
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
        ...change(action.path, { box, pulled: true }, [...others(action.path), action.path]),
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
      // Where the visitor puts it, the size is theirs.
      return change(target.path, { box, mode: 'float', pulled: true })
    }
  }
}
