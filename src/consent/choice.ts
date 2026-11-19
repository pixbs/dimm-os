'use client'

import { useSyncExternalStore } from 'react'

import { registry, version } from './registry'

// A yes and a no are both kept six months, on the device only, with the version they answered and their date.
const KEY = 'consent'
const KEPT = 183 * 24 * 60 * 60 * 1000

export type Choice = { version: string; at: string; on: string[] }

const stored = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// The choice in force, or null where none was made, it is older than six months, or the registry has changed since.
function parse(raw: string | null): Choice | null {
  try {
    const choice = JSON.parse(raw ?? 'null') as Choice | null
    const young = choice && Date.now() - Date.parse(choice.at) < KEPT
    return young && choice.version === version ? choice : null
  } catch {
    return null
  }
}

// Nothing of an entry loads before this holds a yes to it.
export const chosen = () => parse(stored())

const listeners = new Set<() => void>()

export function decide(on: string[]) {
  const choice: Choice = {
    version,
    at: new Date().toISOString(),
    on: on.filter((id) => registry.some((entry) => entry.id === id)),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(choice))
  } catch {
    // A tab without storage asks again next time.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    removeEventListener('storage', listener)
  }
}

// The choice as it changes, here or in another tab; the server knows none.
export function useChoice(): Choice | null {
  const raw = useSyncExternalStore(subscribe, stored, () => null)
  return parse(raw)
}
