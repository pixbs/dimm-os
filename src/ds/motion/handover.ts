import { amount, curve, duration } from './vocabulary'

type Time = Parameters<typeof duration>[0]
type Plays = (part: Element, delay: number) => Animation[]

const ms = (name: Time) => duration(name) * 1000
const ease = (name: Parameters<typeof curve>[0]) => `cubic-bezier(${curve(name)})`

// A count of steps, in ms.
export const step = (count: number) => count * ms('step')

// When each part of the desk arrives, in steps from the press: the language slides over from where it stood on the
// screen that waited, the items of the menu bar drop in, the taskbar rises, the apps grow, the windows travel out of the
// taskbar, and last the visitor's name and the clock show.
export const steps = { language: 2, bar: 3, taskbar: 6, apps: 8, windows: 11, last: 14 }

// Where a part stands before it arrives and after it leaves: a step of space above, below its bar, small, or only
// unseen. A part grows in a shorter time than it takes to reach its size.
const shapes = {
  drop: () => [
    { opacity: 0, translate: `0 calc(${space()} * -1)` },
    { opacity: 1, translate: '0 0' },
  ],
  rise: () => [
    { opacity: 0, translate: '0 100%' },
    { opacity: 1, translate: '0 0' },
  ],
  grow: () => [{ scale: amount('grow') }, { scale: 1 }],
  show: () => [{ opacity: 0 }, { opacity: 1 }],
}
type Shape = keyof typeof shapes
const space = () => getComputedStyle(document.documentElement).getPropertyValue('--s-2')

// A part arrives from its shape into place over the time given on the enter curve, held in its shape until its delay
// is over.
export const arrive =
  (shape: Shape, time: Time = 'slow'): Plays =>
  (part, delay) => {
    const options = { delay, easing: ease('enter'), fill: 'backwards' } as const
    const moves = [part.animate(shapes[shape](), { ...options, duration: ms(time) })]
    if (shape === 'grow')
      moves.push(part.animate(shapes.show(), { ...options, duration: ms('fast') }))
    return moves
  }

// A part leaves the way it came, into its shape over the time given on the exit curve, and stays gone.
export const leave =
  (shape: Shape, time: Time): Plays =>
  (part, delay) => {
    const options = { delay, duration: ms(time), easing: ease('exit'), fill: 'both' } as const
    const moves = [part.animate(shapes[shape](), { ...options, direction: 'reverse' })]
    if (shape === 'grow')
      moves.push(part.animate(shapes.show(), { ...options, direction: 'reverse' }))
    return moves
  }

// What the next screen has at the place of a part of this one slides over from there, over slow and a half on the
// standard curve.
export const slide =
  (from: Element): Plays =>
  (part, delay) => {
    const by = from.getBoundingClientRect().x - part.getBoundingClientRect().x
    return [
      part.animate([{ translate: `${by}px 0` }, { translate: '0 0' }], {
        delay,
        duration: ms('slow') * 1.5,
        easing: ease('standard'),
        fill: 'backwards',
      }),
    ]
  }

// With reduced motion a hand-over is one fade over fast.
export const fade =
  (way: 'in' | 'out'): Plays =>
  (part) => [
    part.animate(shapes.show(), {
      duration: ms('fast'),
      easing: 'linear',
      direction: way === 'in' ? 'normal' : 'reverse',
      fill: 'both',
    }),
  ]

// Parts play in turn from the delay given, each a step after the one before, or the share of a step given.
export const inTurn = (parts: Element[], plays: Plays, from: number, apart = 1) =>
  parts.flatMap((part, at) => plays(part, from + step(at * apart)))

// Parts play one after another from the delay given, each its own move over the time of each, inside the time given
// in all: the last ends as it ends.
export function within(parts: (readonly [Element, Plays])[], time: Time, each: Time, from = 0) {
  const gap = parts.length > 1 ? (ms(time) - ms(each)) / (parts.length - 1) : 0
  return parts.flatMap(([part, plays], at) => plays(part, from + gap * at))
}

// Once every move has ended, or been cut short.
export const ended = (moves: Animation[]) =>
  Promise.all(moves.map((move) => move.finished.catch(() => null)))
