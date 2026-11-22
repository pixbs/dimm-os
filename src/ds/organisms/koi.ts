// Koi, seen from above: five wander the screen, and while the pointer is over the desk each swims round it.
import { between, type Grid, limb, ORANGE, PAPER } from './tones'

const COUNT = 5
// Its half width at each point of its spine, from head to tail, and how long the spine is, for a koi of size 1.
const PLUMP = [9, 15, 19, 21, 21.5, 21, 19.5, 17, 14, 11, 8.5, 6.5, 5, 4, 3.2, 2.6]
const LONG = 240
// A coat is read from head to tail: 0 white, 1 orange, 9 black.
const [ORANGED, BLACK] = [1, 9]
const COATS = [
  [0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 9, 0, 0, 1, 1, 9, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 1, 1, 1, 0, 0, 9, 1, 1, 0, 0, 0, 0],
]
// The tone of a patch: black is nearly no ink, and without colour the orange is a tone darker.
const TONE = { black: 0.26, darker: 0.6 }
// How large each is: the least and what chance adds.
const SIZE = { least: 0.95, more: 0.55 }
// Where each starts, as shares of the screen: the least and what chance adds.
const START = [0.2, 0.6]
// The way behind its head: at first a straight one of this many points this far apart, and at most this many.
const TRAIL = { first: 260, apart: 1.6, most: 340 }
// It swims to a place on the screen, the least and what chance adds across and down, for this many ticks at least
// and what chance adds.
const GOAL = { x: [0.12, 0.76], y: [0.14, 0.72], least: 240, more: 360 }
// The ring each keeps about the pointer: the first and how much wider each next one is, and how far ahead on it
// it aims, in radians.
const RING = { first: 84, wider: 34, ahead: 0.55 }
// How far it turns a tick at most, and how much its swimming swings it.
const TURN = { most: 0.022, swing: 0.004 }
// Pixels a tick: the least and what its size adds, and how much faster while the pointer is over the desk.
const SPEED = { least: 1.2, size: 0.45, pointer: 1.3 }
// Its body sways from head to tail as it swims: how far at the tail, how it grows along it, and the wave.
const SWAY = { far: 9, grows: 1.4, along: 0.5, rate: 0.095 }
// A tail of two lobes that trails and sways: their spread, swing, length, width and tone.
const TAIL = { spread: 0.5, swing: 0.22, behind: 8, long: 46, root: 3, tip: 10, shade: 0.5 }
// Broad fins at the shoulders: where, how far out, their wave, lean back, length, width and tone.
const FINS = {
  at: 3,
  out: 17,
  reach: 0.8,
  wave: 0.2,
  rate: 0.6,
  back: 0.62,
  long: 30,
  root: 8.5,
  tip: 5,
}
const FIN = 0.55

type Koi = {
  size: number
  coat: number[]
  a: number
  x: number
  y: number
  beat: number
  goal: number[]
  wait: number
  trail: number[][]
}

export function koi(grid: Grid, width: number, height: number, random: () => number) {
  const fish: Koi[] = Array.from({ length: COUNT }, (_, index) => {
    const one: Koi = {
      size: SIZE.least + SIZE.more * random(),
      coat: COATS[index % COATS.length],
      a: random() * 6.28,
      x: width * (START[0] + START[1] * random()),
      y: height * (START[0] + START[1] * random()),
      beat: random() * 6.28,
      goal: [0, 0],
      wait: 0,
      trail: [],
    }
    // Its body lies straight behind it to begin with.
    for (let n = 0; n < TRAIL.first; n++)
      one.trail.push([
        one.x - Math.cos(one.a) * n * TRAIL.apart,
        one.y - Math.sin(one.a) * n * TRAIL.apart,
      ])
    return one
  })

  return {
    step(pointer: number[] | null) {
      fish.forEach((one, index) => {
        if (--one.wait <= 0) {
          one.goal = [
            width * (GOAL.x[0] + GOAL.x[1] * random()),
            height * (GOAL.y[0] + GOAL.y[1] * random()),
          ]
          one.wait = GOAL.least + Math.floor(random() * GOAL.more)
        }
        let [gx, gy] = one.goal
        if (pointer) {
          // Each keeps its own ring about the pointer and swims on round it.
          const round = Math.atan2(one.y - pointer[1], one.x - pointer[0]) + RING.ahead
          const ring = RING.first + RING.wider * index
          gx = pointer[0] + Math.cos(round) * ring
          gy = pointer[1] + Math.sin(round) * ring
        }
        const turn = between(one.a, Math.atan2(gy - one.y, gx - one.x))
        one.a +=
          Math.min(TURN.most, Math.max(-TURN.most, turn)) + Math.sin(one.beat * 0.5) * TURN.swing
        const speed = (SPEED.least + SPEED.size * one.size) * (pointer ? SPEED.pointer : 1)
        one.x += Math.cos(one.a) * speed
        one.y += Math.sin(one.a) * speed
        one.beat += SWAY.rate
        one.trail.unshift([one.x, one.y])
        if (one.trail.length > TRAIL.most) one.trail.pop()
      })
    },
    paint(colour: boolean) {
      grid.tones.fill(0)
      grid.inks.fill(0)
      for (const one of fish) {
        const { size: s, trail, beat } = one
        const n = PLUMP.length
        const gap = (LONG * s) / (n - 1)
        const xs: number[] = []
        const ys: number[] = []
        // The spine lies along the way the head has come.
        let at = 0
        let gone = 0
        for (let i = 0; i < n; i++) {
          const want = i * gap
          while (at < trail.length - 2) {
            const step = Math.hypot(
              trail[at + 1][0] - trail[at][0],
              trail[at + 1][1] - trail[at][1],
            )
            if (gone + step >= want) break
            gone += step
            at++
          }
          const [a, b] = [trail[at], trail[at + 1]]
          const [dx, dy] = [a[0] - b[0], a[1] - b[1]]
          const l = Math.hypot(dx, dy) || 1
          const sway =
            SWAY.far * s * Math.pow(i / (n - 1), SWAY.grows) * Math.sin(beat - i * SWAY.along)
          xs.push(a[0] - (dy / l) * sway)
          ys.push(a[1] + (dx / l) * sway)
        }
        const [tx, ty] = [Math.cos(one.a), Math.sin(one.a)]
        const [nx, ny] = [-ty, tx]
        const end = [xs[n - 1], ys[n - 1]]
        const back = Math.atan2(ys[n - 1] - ys[n - 2], xs[n - 1] - xs[n - 2])
        for (let side = -1; side <= 1; side += 2) {
          const q = back + side * TAIL.spread + TAIL.swing * Math.sin(beat - TAIL.behind)
          limb(
            grid,
            end,
            [end[0] + Math.cos(q) * TAIL.long * s, end[1] + Math.sin(q) * TAIL.long * s],
            TAIL.root * s,
            TAIL.tip * s,
            TAIL.shade,
            PAPER,
          )
          const rx = xs[FINS.at] + nx * side * FINS.out * s
          const ry = ys[FINS.at] + ny * side * FINS.out * s
          const wave = FINS.wave * Math.sin(beat * FINS.rate + side)
          limb(
            grid,
            [rx, ry],
            [
              rx + (nx * side * (FINS.reach + wave) - tx * FINS.back) * FINS.long * s,
              ry + (ny * side * (FINS.reach + wave) - ty * FINS.back) * FINS.long * s,
            ],
            FINS.root * s,
            FINS.tip * s,
            FIN,
            PAPER,
          )
        }
        for (let i = 0; i < n - 1; i++) {
          const coat = one.coat[i]
          const shade = coat === BLACK ? TONE.black : coat === ORANGED && !colour ? TONE.darker : 1
          limb(
            grid,
            [xs[i], ys[i]],
            [xs[i + 1], ys[i + 1]],
            PLUMP[i] * s,
            PLUMP[i + 1] * s,
            shade,
            coat === ORANGED ? ORANGE : PAPER,
          )
        }
      }
    },
  }
}
