import { useSyncExternalStore } from 'react'

import { chosen } from './settings'

// Settings live on the root, so whatever shows one follows a change of its attribute.
const watch = (changed: () => void) => {
  const observer = new MutationObserver(changed)
  observer.observe(document.documentElement, { attributes: true })
  return () => observer.disconnect()
}

// The value in force, or null on the server, which does not know the device.
export const useSetting = (name: string) =>
  useSyncExternalStore(
    watch,
    () => document.documentElement.dataset[name] ?? null,
    () => null,
  )

// What the visitor chose, or null where the device decides, read at each write of the root, even one keeping a value.
export const useChosen = (name: string) =>
  useSyncExternalStore(
    watch,
    () => chosen(name),
    () => null,
  )
