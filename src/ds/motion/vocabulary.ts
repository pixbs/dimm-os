import { useSyncExternalStore } from 'react'

type Time = 'fast' | 'slow' | 'long' | 'fast-exit' | 'slow-exit' | 'spread'
type Curve = 'standard' | 'enter' | 'exit' | 'swing' | 'drop'

let probe: HTMLElement | undefined

// Script reads the tokens CSS reads, resolved by the browser on an element that is never drawn.
function read(property: 'transitionDuration' | 'transitionTimingFunction', token: string) {
  probe ??= document.head.appendChild(document.createElement('i'))
  probe.style[property] = `var(--m-${token})`
  return getComputedStyle(probe)[property]
}

// In seconds, as the browser and Motion count.
export const duration = (name: Time) => parseFloat(read('transitionDuration', name))

export const curve = (name: Curve) =>
  read('transitionTimingFunction', name)
    .match(/-?[\d.]+/g)!
    .map(Number) as [number, number, number, number]

// A move the visitor can interrupt: it settles within the token and never bounces.
export const spring = (name: 'fast' | 'slow') =>
  ({ type: 'spring', visualDuration: duration(name), bounce: 0 }) as const

const set = (name: string, value: string) => document.documentElement.dataset[name] === value

export const reduced = () => set('motion', 'reduce')

// What is generated holds still under either setting.
export const still = () => reduced() || set('pause', 'on')

const never = () => () => {}

// True while React takes over what the server painted, which does not animate in.
export const usePainted = () =>
  useSyncExternalStore(
    never,
    () => false,
    () => true,
  )
