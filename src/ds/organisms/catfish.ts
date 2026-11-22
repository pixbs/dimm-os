// Catfish, seen from above: three cross the screen from one corner to the other on a curved way, in ink alone.
import { fin, follow, spine } from './swim'
import { type Grid, limb, PAPER } from './tones'

// The largest is the strongest and the smallest the faintest.
const SIZES = [1.3, 1, 0.7]
const SHADES = [1, 0.75, 0.5]
// How long one of size 1 is in pixels, and its half width at each point of its spine, against its length.
const LENGTH = 150
const GIRTH = [0.075, 0.085, 0.082, 0.075, 0.066, 0.056, 0.046, 0.036, 0.026, 0.018]
// Pixels a tick; near the pointer three times as fast, easing to it by this share a tick.
const SPEED = 0.7
const NEAR = { within: 160, faster: 3, ease: 0.05 }
// How far off the screen a way starts and ends, and how far it bends against the length of the diagonal.
const OFF = 40
const BEND = 0.3
// Its body waves from head to tail as it swims: how far at the tail, how fast against its speed, and how long.
const WAVE = { far: 0.06, rate: 0.09, length: 0.7 }
// Two long barbels trail beside its body, two short ones stand out ahead.
const BARBEL = { parts: 5, spread: 0.05, wave: 0.04, root: 0.012, tip: 0.005, shade: 0.8 }
const SHORT = { angle: 0.55, long: 0.12 }
// Its fins paddle: where they are on its spine, the angle against its back, how far, their length and width.
const FINS = { at: 1, angle: 1.6, far: 0.5, long: 0.18, root: 0.035, tip: 0.012 }
const TAIL = { angle: 0.3, long: 0.15, root: 0.025, tip: 0.01 }
const FAINT = 0.5

type Catfish = {
  length: number
  shade: number
  speed: number
  // The way from corner to corner, as a curve from a by c to b, and how far along it the head is.
  a: number[]
  b: number[]
  c: number[]
  t: number
  way: number[][]
  phase: number
}

export function catfish(grid: Grid, width: number, height: number, random: () => number) {
  const at = ({ a, b, c }: Catfish, t: number) =>
    [0, 1].map((n) => (1 - t) ** 2 * a[n] + 2 * (1 - t) * t * c[n] + t ** 2 * b[n])
  const pace = ({ a, b, c }: Catfish, t: number) =>
    Math.hypot(...[0, 1].map((n) => 2 * (1 - t) * (c[n] - a[n]) + 2 * t * (b[n] - c[n])))

  // A new way from a corner to the one across from it, bent to one side.
  const cross = (one: Catfish) => {
    const out = one.length + OFF
    const corners = [
      [-out, -out],
      [width + out, -out],
      [width + out, height + out],
      [-out, height + out],
    ]
    const from = Math.floor(random() * 4)
    one.a = corners[from]
    one.b = corners[(from + 2) % 4]
    const [dx, dy] = [one.b[0] - one.a[0], one.b[1] - one.a[1]]
    const bend = (random() * 2 - 1) * BEND
    one.c = [(one.a[0] + one.b[0]) / 2 - dy * bend, (one.a[1] + one.b[1]) / 2 + dx * bend]
  }
  // Its body lies along the way behind its head, even where the way began before the screen.
  const lay = (one: Catfish) => {
    one.way = []
    // A step of one pixel back along the way at a time.
    for (let t = one.t, n = 0; n <= one.length + 1; n++, t -= 1 / pace(one, t))
      one.way.push(at(one, t))
  }

  const fish = SIZES.map((size, index) => {
    const one = { length: LENGTH * size, shade: SHADES[index], speed: SPEED, phase: 0 } as Catfish
    cross(one)
    // To begin with they are on the screen.
    one.t = 0.3 + random() * 0.4
    lay(one)
    return one
  })

  return {
    step(pointer: number[] | null) {
      for (const one of fish) {
        const [x, y] = one.way[0]
        const near = pointer && Math.hypot(x - pointer[0], y - pointer[1]) < NEAR.within
        one.speed += (SPEED * (near ? NEAR.faster : 1) - one.speed) * NEAR.ease
        one.phase += one.speed * WAVE.rate
        one.t += one.speed / pace(one, one.t)
        if (one.t > 1) {
          cross(one)
          one.t = 0
          lay(one)
        } else follow(one.way, at(one, one.t), one.length)
      }
    },
    paint() {
      grid.tones.fill(0)
      grid.inks.fill(0)
      for (const { length, shade, way, phase } of fish) {
        const count = GIRTH.length
        // The spine waves to either side, more towards the tail.
        const points = spine(way, count, length).map(([x, y, facing], k) => {
          const off = Math.sin(phase - k * WAVE.length) * WAVE.far * length * (k / (count - 1))
          return [x - Math.sin(facing) * off, y + Math.cos(facing) * off, facing]
        })
        const faint = shade * FAINT
        const paddle = Math.sin(phase) * FINS.far
        for (const side of [-1, 1]) {
          fin(
            grid,
            points[FINS.at],
            side * (FINS.angle + paddle),
            FINS.long * length,
            [FINS.root * length, FINS.tip * length],
            faint,
            PAPER,
          )
          fin(
            grid,
            points[count - 1],
            Math.PI + side * TAIL.angle,
            TAIL.long * length,
            [TAIL.root * length, TAIL.tip * length],
            faint,
            PAPER,
          )
          fin(
            grid,
            points[0],
            side * SHORT.angle,
            SHORT.long * length,
            [BARBEL.root * length, BARBEL.tip * length],
            shade * BARBEL.shade,
            PAPER,
          )
          // A long barbel trails from the corner of its mouth, wider of the body the farther back.
          const barbel = points.slice(0, BARBEL.parts).map(([x, y, facing], j) => {
            const out =
              GIRTH[0] * length +
              (BARBEL.spread + Math.sin(phase - j) * BARBEL.wave) *
                length *
                (j / (BARBEL.parts - 1))
            return [x - Math.sin(facing) * out * side, y + Math.cos(facing) * out * side]
          })
          for (let j = 0; j < barbel.length - 1; j++)
            limb(
              grid,
              barbel[j],
              barbel[j + 1],
              BARBEL.root * length,
              BARBEL.tip * length,
              shade * BARBEL.shade,
              PAPER,
            )
        }
        for (let n = 0; n < count - 1; n++)
          limb(
            grid,
            points[n],
            points[n + 1],
            GIRTH[n] * length,
            GIRTH[n + 1] * length,
            shade,
            PAPER,
          )
      }
    },
  }
}
