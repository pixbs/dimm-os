// Dragonflies: five hover, each waits trembling, then darts to a new place and lands softly, often near the pointer.
import { BEAT, fly } from './passage'
import { between, type Grid } from './tones'

const COUNT = 5
// Where each starts, as shares of the screen: the least and what chance adds, across and down.
const START = { x: [0.25, 0.65], y: [0.15, 0.7] }
// How large each is against the drawing of Passage, and how long it waits at first, in ticks.
const SIZE = { least: 1.5, more: 0.6 }
const FIRST = 120
// How long it waits after it lands, in ticks: at least, and what chance adds.
const WAIT = { least: 40, more: 150 }
// While it waits it trembles in place, drifting this far a tick at these rates.
const TREMBLE = { far: 0.3, x: 0.31, y: 0.27 }
// A dart takes this many ticks at least, and what chance adds, and it turns this share of the way each tick.
const DART = { least: 22, more: 16, turn: 0.3 }
// Six times in ten, while the pointer is over the desk, it darts near it: this far from it, at least and what
// chance adds.
const NEAR = { share: 0.6, least: 90, more: 120 }
// Elsewhere it darts to a place on the screen: the least and what chance adds, across and down.
const ANY = { x: [0.12, 0.8], y: [0.1, 0.8] }
// A place to land keeps this far from the edge of the screen.
const EDGE = 60

type Flier = {
  x: number
  y: number
  // The way it faces and the way it turns to.
  a: number
  to: number
  from: number[]
  target: number[]
  // How far through its dart it is, from 0 to 1, and how many ticks the dart takes.
  t: number
  long: number
  wait: number
  size: number
  shade: number
  ink: number
}

const keep = (value: number, least: number, most: number) =>
  value < least ? least : value > most ? most : value

export function dragonflies(grid: Grid, width: number, height: number, random: () => number) {
  let tick = 0
  // Their bodies are orange, blue and mint in turn.
  const fliers: Flier[] = Array.from({ length: COUNT }, (_, index) => ({
    x: width * (START.x[0] + START.x[1] * random()),
    y: height * (START.y[0] + START.y[1] * random()),
    a: random() * 6.28,
    to: 0,
    from: [0, 0],
    target: [0, 0],
    t: 1,
    long: 30,
    wait: Math.floor(random() * FIRST),
    size: SIZE.least + SIZE.more * random(),
    shade: 1,
    ink: 1 + (index % 3),
  }))

  return {
    step(pointer: number[] | null) {
      tick++
      fliers.forEach((one, index) => {
        if (one.t < 1) {
          // It lands softly: fast from the start, slow at the end.
          one.t = Math.min(1, one.t + 1 / one.long)
          const eased = 1 - Math.pow(1 - one.t, 3)
          one.x = one.from[0] + (one.target[0] - one.from[0]) * eased
          one.y = one.from[1] + (one.target[1] - one.from[1]) * eased
          if (one.t === 1) one.wait = WAIT.least + Math.floor(random() * WAIT.more)
        } else if (one.wait > 0) {
          one.wait--
          one.x += Math.sin(tick * TREMBLE.x + index) * TREMBLE.far
          one.y += Math.cos(tick * TREMBLE.y + index * 2) * TREMBLE.far
        } else {
          let [x, y] = [0, 0]
          if (pointer && random() < NEAR.share) {
            const angle = random() * 6.28
            const far = NEAR.least + random() * NEAR.more
            x = pointer[0] + Math.cos(angle) * far
            y = pointer[1] + Math.sin(angle) * far
          } else {
            x = width * (ANY.x[0] + ANY.x[1] * random())
            y = height * (ANY.y[0] + ANY.y[1] * random())
          }
          one.target = [keep(x, EDGE, width - EDGE), keep(y, EDGE, height - EDGE)]
          one.from = [one.x, one.y]
          one.t = 0
          one.long = DART.least + Math.floor(random() * DART.more)
          one.to = Math.atan2(one.target[1] - one.from[1], one.target[0] - one.from[0])
        }
        one.a += between(one.a, one.to) * DART.turn
      })
    },
    paint() {
      grid.tones.fill(0)
      grid.inks.fill(0)
      fliers.forEach((one, index) =>
        fly(grid, one, [one.x, one.y], one.a, Math.sin(tick * BEAT.rate + index) * BEAT.far),
      )
    },
  }
}
