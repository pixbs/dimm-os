// Koi, seen from above: five wander the screen, and while the pointer is over the desk each swims round it.
import { between, fin, follow, spine } from './swim'
import { type Grid, limb, ORANGE, PAPER } from './tones'

const COUNT = 5
// How long one is in pixels, and how much larger or smaller chance makes it.
const LENGTH = 110
const SIZE = { least: 0.8, more: 0.4 }
// Its half width at each point of its spine, from head to tail, against its length.
const GIRTH = [0.06, 0.1, 0.12, 0.125, 0.12, 0.105, 0.09, 0.07, 0.05, 0.035, 0.025, 0.02]
// Pixels a tick, and how its head swings from side to side as it swims.
const SPEED = 0.9
const SWING = { far: 0.22, rate: 0.12 }
// How its way bends at random, and how fast it turns back from the edge or to its ring, in radians a tick.
const WANDER = { far: 0.004, keep: 0.96 }
const EDGE = 80
const TURN = 0.035
// The ring each keeps about the pointer: at least, and what chance adds.
const RING = { least: 70, more: 130 }
// Its coat is patches of one to three parts of its body each.
const RUN = 3
// The tone of each patch: white, orange in colour, orange without colour, and black.
const TONE = { white: 1, orange: 1, darker: 0.65, black: 0.22 }
// Its tail and fins: the angle against its back, how far and fast they move, their length and width, and their tone.
const TAIL = { angle: 0.35, far: 0.25, rate: 0.12, long: 0.28, root: 0.03, tip: 0.012 }
const FINS = { at: 2, angle: 2.1, far: 0.3, rate: 0.1, long: 0.2, root: 0.04, tip: 0.015 }
const FAINT = 0.5

// The patches in the order of their tones.
const ORANGED = 1

type Koi = {
  length: number
  heading: number
  bend: number
  way: number[][]
  coat: number[]
  ring: number
  round: number
  phase: number
}

export function koi(grid: Grid, width: number, height: number, random: () => number) {
  let tick = 0
  const fish: Koi[] = Array.from({ length: COUNT }, () => {
    const length = LENGTH * (SIZE.least + random() * SIZE.more)
    const heading = random() * Math.PI * 2
    const head = [EDGE + random() * (width - EDGE * 2), EDGE + random() * (height - EDGE * 2)]
    // A coat read from head to tail: each patch another of white, orange and black than the one before.
    const coat: number[] = []
    let patch = Math.floor(random() * 2)
    while (coat.length < GIRTH.length) {
      coat.push(...Array<number>(1 + Math.floor(random() * RUN)).fill(patch))
      patch = (patch + 1 + Math.floor(random() * 2)) % 3
    }
    return {
      length,
      heading,
      bend: 0,
      // It begins straight behind its head.
      way: [head, [head[0] - Math.cos(heading) * length, head[1] - Math.sin(heading) * length]],
      coat,
      ring: RING.least + random() * RING.more,
      round: random() < 0.5 ? -1 : 1,
      phase: random() * Math.PI * 2,
    }
  })

  return {
    step(pointer: number[] | null) {
      tick++
      for (const one of fish) {
        const [x, y] = one.way[0]
        one.bend = (one.bend + (random() * 2 - 1) * WANDER.far) * WANDER.keep
        let toward: number | undefined
        if (pointer) {
          // Round its ring: along it, leaning in when outside it and out when inside it.
          const dx = x - pointer[0]
          const dy = y - pointer[1]
          const off = (Math.hypot(dx, dy) - one.ring) / one.ring
          toward = Math.atan2(dy, dx) + one.round * (Math.PI / 2 + Math.atan(off * 2))
        } else if (x < EDGE || x > width - EDGE || y < EDGE || y > height - EDGE)
          toward = Math.atan2(height / 2 - y, width / 2 - x)
        one.heading +=
          toward === undefined
            ? one.bend
            : Math.max(-TURN, Math.min(TURN, between(one.heading, toward)))
        const swim = one.heading + Math.sin(tick * SWING.rate + one.phase) * SWING.far
        follow(one.way, [x + Math.cos(swim) * SPEED, y + Math.sin(swim) * SPEED], one.length)
      }
    },
    paint(colour: boolean) {
      grid.tones.fill(0)
      grid.inks.fill(0)
      const tones = [TONE.white, colour ? TONE.orange : TONE.darker, TONE.black]
      for (const one of fish) {
        const { length, coat, phase } = one
        const points = spine(one.way, GIRTH.length, length)
        const tail = points[points.length - 1]
        const flap = Math.sin(tick * TAIL.rate + phase) * TAIL.far
        for (const side of [-1, 1]) {
          fin(
            grid,
            tail,
            Math.PI + side * TAIL.angle + flap,
            TAIL.long * length,
            [TAIL.root * length, TAIL.tip * length],
            FAINT,
            PAPER,
          )
          fin(
            grid,
            points[FINS.at],
            side * (FINS.angle + Math.sin(tick * FINS.rate + phase) * FINS.far),
            FINS.long * length,
            [FINS.root * length, FINS.tip * length],
            FAINT,
            PAPER,
          )
        }
        for (let n = 0; n < points.length - 1; n++)
          limb(
            grid,
            points[n],
            points[n + 1],
            GIRTH[n] * length,
            GIRTH[n + 1] * length,
            tones[coat[n]],
            coat[n] === ORANGED ? ORANGE : PAPER,
          )
      }
    },
  }
}
