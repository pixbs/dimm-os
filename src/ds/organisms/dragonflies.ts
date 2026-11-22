// Dragonflies: five hover, each waits trembling, then darts to a new place and lands softly, often near the pointer.
import { BEAT, fly } from './passage'
import { between } from './swim'
import type { Grid } from './tones'

const COUNT = 5
// How large each is against the drawing of Passage: the least and what the largest adds.
const SIZE = { least: 1.2, more: 0.5 }
// How long one waits, in ticks: at least, and what chance adds.
const WAIT = { least: 40, more: 110 }
// A dart takes a third of a second, and turns to its new way in the first half of it.
const DART = 20
const TURN = 0.5
// Six times in ten a dart ends near the pointer: this far from it, at least and what chance adds.
const NEAR = { share: 0.6, least: 40, more: 90 }
// A place to land keeps this far from the edge of the screen.
const EDGE = 60
// While it waits it trembles in place: this far, this fast.
const TREMBLE = { far: 1.5, rate: 0.9 }

type Flier = {
  size: number
  shade: number
  ink: number
  from: number[]
  to: number[]
  // The way it faced and the way it faces at the end of the dart.
  was: number
  turn: number
  // Ticks since the dart began, or what is left of its wait while it waits.
  dart: number
  wait: number
}

// It lands softly: fast from the start, slow at the end.
const soft = (t: number) => 1 - (1 - t) ** 3

export function dragonflies(grid: Grid, width: number, height: number, random: () => number) {
  let tick = 0
  const inside = (along: number, size: number) => Math.min(size - EDGE, Math.max(EDGE, along))
  const anywhere = () => [
    inside(EDGE + random() * (width - EDGE * 2), width),
    inside(EDGE + random() * (height - EDGE * 2), height),
  ]
  // Their bodies are orange, blue and mint in turn.
  const fliers: Flier[] = Array.from({ length: COUNT }, (_, index) => {
    const at = anywhere()
    const turn = random() * Math.PI * 2
    return {
      size: SIZE.least + random() * SIZE.more,
      shade: 1,
      ink: (index % 3) + 1,
      from: at,
      to: at,
      was: turn,
      turn,
      dart: DART,
      wait: random() * WAIT.more,
    }
  })

  const place = (one: Flier, index: number) => {
    const t = soft(Math.min(1, one.dart / DART))
    const [x, y] = one.from.map((from, n) => from + (one.to[n] - from) * t)
    if (one.dart < DART) return [x, y]
    const phase = tick * TREMBLE.rate + index * 1.7
    return [x + Math.sin(phase) * TREMBLE.far, y + Math.cos(phase * 1.3) * TREMBLE.far]
  }
  const facing = (one: Flier) =>
    one.was + between(one.was, one.turn) * soft(Math.min(1, one.dart / (DART * TURN)))

  return {
    step(pointer: number[] | null) {
      tick++
      for (const one of fliers) {
        if (one.dart < DART) {
          if (++one.dart === DART) one.wait = WAIT.least + random() * WAIT.more
          continue
        }
        if (--one.wait > 0) continue
        let to = anywhere()
        if (pointer && random() < NEAR.share) {
          const angle = random() * Math.PI * 2
          const far = NEAR.least + random() * NEAR.more
          to = [
            inside(pointer[0] + Math.cos(angle) * far, width),
            inside(pointer[1] + Math.sin(angle) * far, height),
          ]
        }
        one.was = facing(one)
        one.from = one.to
        one.to = to
        one.turn = Math.atan2(to[1] - one.from[1], to[0] - one.from[0])
        one.dart = 0
      }
    },
    paint() {
      grid.tones.fill(0)
      grid.inks.fill(0)
      fliers.forEach((one, index) =>
        fly(
          grid,
          one,
          place(one, index),
          facing(one),
          Math.sin(tick * BEAT.rate + index) * BEAT.far,
        ),
      )
    },
  }
}
