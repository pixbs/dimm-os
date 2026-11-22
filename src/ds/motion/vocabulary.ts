import { useSyncExternalStore } from 'react'

type Time =
  | 'fast'
  | 'slow'
  | 'long'
  | 'fast-exit'
  | 'slow-exit'
  | 'travel'
  | 'spread'
  | 'next'
  | 'letter'
  | 'decode'
  | 'wait'
  | 'hold'
  | 'note'
type Curve = 'standard' | 'enter' | 'exit' | 'swing' | 'drop' | 'across' | 'up'

let probe: HTMLElement | undefined
const known = new Map<string, string>()

// Script reads the tokens CSS reads, resolved by the browser on an element that is never drawn: once for
// each motion setting, since every question recalculates the styles of the page.
function read(property: 'transitionDuration' | 'transitionTimingFunction', token: string) {
  const key = `${property} ${token} ${document.documentElement.dataset.motion}`
  let value = known.get(key)
  if (value === undefined) {
    probe ??= document.head.appendChild(document.createElement('i'))
    // Important, since a crossfade turns every transition of the page off while it plays.
    const name =
      property === 'transitionDuration' ? 'transition-duration' : 'transition-timing-function'
    probe.style.setProperty(name, `var(--m-${token})`, 'important')
    const style = getComputedStyle(probe)
    value = style[property]
    // An answer from before the stylesheet arrived is not a token's, so it is not kept.
    if (style.getPropertyValue(`--m-${token}`)) known.set(key, value)
  }
  return value
}

// In seconds, as the browser and Motion count.
export const duration = (name: Time) => parseFloat(read('transitionDuration', name))

export const curve = (name: Curve) =>
  read('transitionTimingFunction', name)
    .match(/-?[\d.]+/g)!
    .map(Number) as [number, number, number, number]

// A token that counts rather than times.
export const amount = (name: 'run' | 'settle') =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--m-${name}`))

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
