import type { WindowView } from '@/data/views'

export type Windows = {
  // In the order they opened, which is their order in the page: coming forward moves no element.
  open: WindowView[]
  // Their paths, back to front.
  z: string[]
}

export type Action =
  | { type: 'open'; window: WindowView }
  | { type: 'focus'; path: string }
  | { type: 'close'; path: string }
  // Windows of an earlier load, back to front, go behind the ones already open.
  | { type: 'restore'; windows: WindowView[] }

export const start = (window: WindowView | null): Windows =>
  window ? { open: [window], z: [window.path] } : { open: [], z: [] }

export const front = (windows: Windows): string | undefined => windows.z.at(-1)

export function manager(state: Windows, action: Action): Windows {
  switch (action.type) {
    case 'open': {
      const { path } = action.window
      return {
        open: state.z.includes(path)
          ? state.open.map((window) => (window.path === path ? action.window : window))
          : [...state.open, action.window],
        z: [...state.z.filter((other) => other !== path), path],
      }
    }
    case 'focus': {
      if (front(state) === action.path || !state.z.includes(action.path)) return state
      return { ...state, z: [...state.z.filter((path) => path !== action.path), action.path] }
    }
    case 'close':
      return {
        open: state.open.filter((window) => window.path !== action.path),
        z: state.z.filter((path) => path !== action.path),
      }
    case 'restore': {
      const added = action.windows.filter((window) => !state.z.includes(window.path))
      return {
        open: [...state.open, ...added],
        z: [...added.map((window) => window.path), ...state.z],
      }
    }
  }
}
