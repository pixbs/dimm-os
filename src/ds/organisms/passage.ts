// Passage: dragonflies come in at the bottom left and leave at the top right, without end.
import { type Grid, limb, PAPER, type Scene } from './tones'

const DEG = Math.PI / 180
// A dragonfly, in its own units along its body: head, thorax and tail, each from, to, a radius at either end and
// a strength.
const BODY = [
  [21, 21, 5.5, 5.5, 1],
  [15, 2, 5, 4.4, 1],
  [2, -54, 3.2, 1.5, 0.95],
]
// Its fore and hind wing: the root, the lean in degrees, the way it beats and the length.
const WINGS = [
  [10, 12, 1, 46],
  [4, -14, -1, 42],
]
// A wing widens from its root to its bend, a little past the middle, and narrows to its tip; it is thin, so fainter.
const WING = { root: 2, bend: 6.5, tip: 4, at: 0.55, shade: 0.45 }
// How far the wings beat, in degrees, and how fast.
export const BEAT = { far: 10, rate: 1.9 }

// How many fly on a desk and on a phone, which is a screen under this width.
const COUNT = { desk: 14, phone: 8, under: 600 }
// The farthest and what the nearest adds to it: size, strength and speed in pixels a tick.
const FAR = { size: 0.8, shade: 0.5, speed: 1.6 }
const NEAR = { size: 1.5, shade: 0.5, speed: 3.2 }
// How far a lane lies to either side of the way, and how far off the screen a dragonfly starts and ends.
const LANES = 620
const OFF = 150
// Each sways about its lane and turns a little as it does.
const SWAY = { far: 18, rate: 0.03, turn: 0.12 }
// Within this of the pointer it moves aside, by this share of how near it is, easing there by this share a tick.
const ROOM = { within: 170, push: 0.9, ease: 0.08 }

type Flier = {
  size: number
  shade: number
  speed: number
  lane: number
  along: number
  sway: number
  aside: number
  ink: number
}

// One drawing serves every scene with dragonflies: four wings that beat against each other, a head, a thorax,
// a long tail.
export function fly(
  grid: Grid,
  flier: Pick<Flier, 'size' | 'shade' | 'ink'>,
  [x, y]: number[],
  turn: number,
  beat: number,
) {
  const { size, shade, ink } = flier
  const cos = Math.cos(turn) * size
  const sin = Math.sin(turn) * size
  const at = (along: number, across: number) => [
    x + cos * along - sin * across,
    y + sin * along + cos * across,
  ]
  for (const side of [-1, 1])
    for (const [root, lean, way, long] of WINGS) {
      const q = (90 - lean - way * beat) * DEG * side
      const part = (share: number) =>
        at(root + Math.cos(q) * long * share, Math.sin(q) * long * share)
      const faint = WING.shade * shade
      limb(grid, at(root, 0), part(WING.at), WING.root * size, WING.bend * size, faint, PAPER)
      limb(grid, part(WING.at), part(1), WING.bend * size, WING.tip * size, faint, PAPER)
    }
  for (const [from, to, ra, rb, strength] of BODY)
    limb(grid, at(from, 0), at(to, 0), ra * size, rb * size, strength * shade, ink, true)
}

export function passage(grid: Grid, width: number, height: number, random: () => number): Scene {
  const way = Math.hypot(width, height)
  const ux = width / way
  const uy = -height / way
  let tick = 0

  // The near ones are larger, faster and stronger, the far ones small and faint.
  const flier = (fresh: boolean): Flier => {
    const near = random()
    return {
      size: FAR.size + NEAR.size * near,
      shade: FAR.shade + NEAR.shade * near,
      speed: FAR.speed + NEAR.speed * near,
      lane: (random() * 2 - 1) * LANES,
      // To begin with they are spread over the whole way.
      along: fresh ? random() * (way + OFF * 2) - OFF : -OFF,
      sway: random() * 6.28,
      aside: 0,
      ink: 1 + Math.floor(random() * 3),
    }
  }
  const fliers = Array.from({ length: width < COUNT.under ? COUNT.phone : COUNT.desk }, () =>
    flier(true),
  )
  const place = (one: Flier) => {
    const lane = one.lane + one.aside + Math.sin(tick * SWAY.rate + one.sway) * SWAY.far
    return [ux * one.along - uy * lane, height + uy * one.along + ux * lane]
  }

  return {
    step(pointer: number[] | null) {
      tick++
      for (const one of fliers) {
        one.along += one.speed
        if (one.along > way + OFF) Object.assign(one, flier(false))
        let push = 0
        if (pointer) {
          const [x, y] = place(one)
          const dx = x - pointer[0]
          const dy = y - pointer[1]
          const far = Math.hypot(dx, dy)
          // To the side of its way that it is already on.
          if (far < ROOM.within)
            push = (-uy * dx + ux * dy >= 0 ? 1 : -1) * (ROOM.within - far) * ROOM.push
        }
        one.aside += (push - one.aside) * ROOM.ease
      }
    },
    paint() {
      grid.tones.fill(0)
      grid.inks.fill(0)
      const ahead = Math.atan2(uy, ux)
      fliers.forEach((one, index) =>
        fly(
          grid,
          one,
          place(one),
          ahead + Math.cos(tick * SWAY.rate + one.sway) * SWAY.turn,
          Math.sin(tick * BEAT.rate + index) * BEAT.far,
        ),
      )
    },
  }
}
