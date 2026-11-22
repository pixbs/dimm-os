// Catfish, seen from above: three cross the screen from corner to corner on a curved way, in ink alone.
import { type Grid, limb, PAPER } from './tones'

// Its half width at each point of its spine, from head to tail, and how long the spine is, for a catfish of size 1.
const GIRTH = [16, 22, 25, 25, 23, 20, 17, 14, 11.5, 9.5, 7.5, 6, 4.8, 3.8, 3, 2.4]
const LONG = 300
// The three, largest first: the largest the strongest and the smallest the faintest, each this far along its
// first way.
const FISH = [
  { size: 1.5, shade: 1, t: 0.5 },
  { size: 1.1, shade: 0.72, t: 0.2 },
  { size: 0.8, shade: 0.5, t: 0.75 },
]
// The corners a way runs between, as shares of the screen, just off it.
const CORNERS = [
  [-0.14, -0.18],
  [1.14, -0.18],
  [1.14, 1.18],
  [-0.14, 1.18],
]
// The two points that bend a way lie on the screen: the least and what chance adds.
const BEND = [0.2, 0.6]
// How many parts a way is measured in.
const PARTS = 24
// Pixels a tick: the least and what its size adds. Within this of the pointer it speeds up to three times, easing
// by this share a tick, and it beats faster as it does.
const SPEED = { least: 0.9, size: 0.5 }
const NEAR = { within: 220, faster: 3, ease: 0.05 }
const BEAT = { rate: 0.085, least: 0.6, rush: 0.4 }
// Past the end of its way by this much of its size, it waits off the screen this many ticks at least, and what
// chance adds.
const PAST = 320
const WAIT = { least: 60, more: 200 }
// Its body waves from head to tail: how far at the tail, how it grows along it, and the wave.
const SWAY = { far: 16, grows: 1.5, along: 0.55 }
// Its tail fin: its length, width and tone.
const TAIL = { long: 30, root: 2.4, tip: 11, shade: 0.6 }
// Its fins paddle: where, how far out, how they paddle, lean back, length, width and tone.
const FINS = {
  at: 3,
  out: 20,
  reach: 0.9,
  paddle: 0.25,
  back: 0.6,
  long: 36,
  root: 7,
  tip: 2.2,
  shade: 0.7,
}
// Its barbels start at the corners of its mouth: a long pair whose ends drift and a short pair, each a curve through
// a bend to an end, ahead and out in its own units, with its tone; all are drawn in parts, this wide.
const MOUTH = { ahead: 13, out: 8 }
const DRIFT = { rate: 0.7, far: 7 }
const BARBELS = [
  { bend: [36, 34], end: [14, 84], shade: 0.8, drifts: true },
  { bend: [22, 6], end: [40, 20], shade: 0.7, drifts: false },
]
const BARBEL = { root: 1.7, tip: 1.5, parts: 6 }

type Catfish = {
  size: number
  shade: number
  beat: number
  rush: number
  wait: number
  // The way, a curve from one corner to another, its length, and how far along it the head is.
  way: number[][]
  length: number
  t: number
}

// A point on the way, a share of the way along.
function on(way: number[][], t: number) {
  const m = 1 - t
  return [0, 1].map(
    (n) =>
      m * m * m * way[0][n] +
      3 * m * m * t * way[1][n] +
      3 * m * t * t * way[2][n] +
      t * t * t * way[3][n],
  )
}

// The way it faces there.
function facing(way: number[][], t: number) {
  const m = 1 - t
  const [x, y] = [0, 1].map(
    (n) =>
      3 * m * m * (way[1][n] - way[0][n]) +
      6 * m * t * (way[2][n] - way[1][n]) +
      3 * t * t * (way[3][n] - way[2][n]),
  )
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}

export function catfish(grid: Grid, width: number, height: number, random: () => number) {
  // A new way from one corner to another, bent by two points on the screen.
  const route = (one: Catfish) => {
    const a = Math.floor(random() * 4)
    const b = (a + 1 + Math.floor(random() * 3)) % 4
    const bend = () => [
      width * (BEND[0] + BEND[1] * random()),
      height * (BEND[0] + BEND[1] * random()),
    ]
    one.way = [
      [CORNERS[a][0] * width, CORNERS[a][1] * height],
      bend(),
      bend(),
      [CORNERS[b][0] * width, CORNERS[b][1] * height],
    ]
    let length = 0
    let was = one.way[0]
    for (let k = 1; k <= PARTS; k++) {
      const now = on(one.way, k / PARTS)
      length += Math.hypot(now[0] - was[0], now[1] - was[1])
      was = now
    }
    one.length = length
    one.t = 0
  }
  const fish = FISH.map(({ size, shade, t }) => {
    const one = { size, shade, beat: random() * 6.28, rush: 1, wait: 0 } as Catfish
    route(one)
    one.t = t
    return one
  })

  // A barbel: a curve from a by b to c, in parts.
  const barbel = (a: number[], b: number[], c: number[], shade: number) => {
    let was = a
    for (let k = 1; k <= BARBEL.parts; k++) {
      const t = k / BARBEL.parts
      const m = 1 - t
      const now = [0, 1].map((n) => m * m * a[n] + 2 * m * t * b[n] + t * t * c[n])
      limb(grid, was, now, BARBEL.root, BARBEL.tip, shade, PAPER)
      was = now
    }
  }

  return {
    step(pointer: number[] | null) {
      for (const one of fish) {
        if (one.wait > 0) {
          one.wait--
          continue
        }
        const head = on(one.way, one.t)
        const near =
          !!pointer && Math.hypot(head[0] - pointer[0], head[1] - pointer[1]) < NEAR.within
        one.rush += ((near ? NEAR.faster : 1) - one.rush) * NEAR.ease
        one.t += ((SPEED.least + SPEED.size * one.size) * one.rush) / one.length
        one.beat += BEAT.rate * (BEAT.least + BEAT.rush * one.rush)
        if (one.t - (PAST * one.size) / one.length > 1) {
          route(one)
          one.wait = WAIT.least + Math.floor(random() * WAIT.more)
        }
      }
    },
    paint() {
      grid.tones.fill(0)
      grid.inks.fill(0)
      // The smallest first, so the larger lie over it.
      for (let k = fish.length - 1; k >= 0; k--) {
        const one = fish[k]
        if (one.wait > 0) continue
        const { size: s, shade, beat, way } = one
        const long = LONG * s
        const n = GIRTH.length
        const xs: number[] = []
        const ys: number[] = []
        let [tx, ty] = [0, 0]
        for (let i = 0; i < n; i++) {
          const t = one.t - (i * long) / (n - 1) / one.length
          const at = on(way, t)
          const dir = facing(way, t)
          const sway =
            SWAY.far * s * Math.pow(i / (n - 1), SWAY.grows) * Math.sin(beat - i * SWAY.along)
          xs.push(at[0] - dir[1] * sway)
          ys.push(at[1] + dir[0] * sway)
          if (i === 0) [tx, ty] = dir
        }
        for (let i = 0; i < n - 1; i++)
          limb(
            grid,
            [xs[i], ys[i]],
            [xs[i + 1], ys[i + 1]],
            GIRTH[i] * s,
            GIRTH[i + 1] * s,
            shade,
            PAPER,
          )
        const [bx, by] = [xs[n - 1] - xs[n - 2], ys[n - 1] - ys[n - 2]]
        const bl = Math.hypot(bx, by) || 1
        limb(
          grid,
          [xs[n - 1], ys[n - 1]],
          [xs[n - 1] + (bx / bl) * TAIL.long * s, ys[n - 1] + (by / bl) * TAIL.long * s],
          TAIL.root * s,
          TAIL.tip * s,
          shade * TAIL.shade,
          PAPER,
        )
        const [nx, ny] = [-ty, tx]
        const paddle = FINS.paddle * Math.sin(beat * 0.5)
        for (let side = -1; side <= 1; side += 2) {
          const rx = xs[FINS.at] + nx * side * FINS.out * s
          const ry = ys[FINS.at] + ny * side * FINS.out * s
          limb(
            grid,
            [rx, ry],
            [
              rx + (nx * side * (FINS.reach + paddle) - tx * FINS.back) * FINS.long * s,
              ry + (ny * side * (FINS.reach + paddle) - ty * FINS.back) * FINS.long * s,
            ],
            FINS.root * s,
            FINS.tip * s,
            shade * FINS.shade,
            PAPER,
          )
          const mx = xs[0] + tx * MOUTH.ahead * s + nx * side * MOUTH.out * s
          const my = ys[0] + ty * MOUTH.ahead * s + ny * side * MOUTH.out * s
          const drift = Math.sin(beat * DRIFT.rate + side) * DRIFT.far * s
          for (const { bend, end, shade: tone, drifts } of BARBELS) {
            const off = drifts ? drift : 0
            barbel(
              [mx, my],
              [
                mx + (tx * bend[0] + nx * side * bend[1]) * s,
                my + (ty * bend[0] + ny * side * bend[1]) * s,
              ],
              [
                mx + (tx * end[0] + nx * side * end[1]) * s - tx * off,
                my + (ty * end[0] + ny * side * end[1]) * s - ty * off,
              ],
              shade * tone,
            )
          }
        }
      }
    },
  }
}
