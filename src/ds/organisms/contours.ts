// Contours: the level lines of a slow relief about where the first halftone stood, fading toward its edge. Every
// fourth line is heavier, as on a map, and in colour orange; the pointer raises a hill under it.
import { type Grid, home, ORANGE, type Scene } from './tones'

// The relief is four waves across the screen, each started at a place of its own: how dense across and down, and how
// fast each drifts, a second at a time.
const WAVES = {
  first: [0.0042, 0.0051, 0.11, 0.07],
  second: { weight: 0.6, dense: 0.0031, rate: 0.05 },
  third: { weight: 0.4, dense: 0.0064, down: 1.3, rate: 0.09 },
}
// The hill under the pointer: how high, how wide, and the share a tick by which it rises and sinks.
const HILL = { high: 1.4, wide: 57800, ease: 0.06 }
// How many levels a unit of height holds, and how strong the lines are.
const LEVELS = 3.2
const STRENGTH = 0.88
// A line is full this close to its level, and the heavier ones wider.
const LINE = { full: 1.15, light: 0.8, heavy: 1.5, every: 4 }
// The lines fade out this many radii from home.
const FADE = { start: 1.25, reach: 1.9 }

export function contours(grid: Grid, width: number, height: number, random: () => number): Scene {
  const form = home(width, height, grid.pitch)
  const waves = [random() * 6.28, random() * 6.28, random() * 6.28, random() * 6.28]
  const heights = new Float32Array(grid.wide * grid.high)
  // Where the pointer was last over the desk: the hill sinks there when it leaves.
  let at = [0, 0]
  let hill = 0
  let tick = 0

  return {
    step(pointer) {
      tick++
      if (pointer) at = pointer
      hill += ((pointer ? 1 : 0) - hill) * HILL.ease
    },
    paint() {
      const { pitch, wide, high, tones, inks } = grid
      const g = pitch / 2
      const t = tick / 60
      const [a, b, c, d] = WAVES.first
      const { second, third } = WAVES
      for (let y = 0; y < high; y++) {
        const py = (y + 0.5) * g
        for (let x = 0; x < wide; x++) {
          const px = (x + 0.5) * g
          let h =
            Math.sin(px * a + t * c + waves[0]) * Math.cos(py * b - t * d + waves[1]) +
            second.weight * Math.sin((px + py) * second.dense + t * second.rate + waves[2]) +
            third.weight *
              Math.cos((px - py * third.down) * third.dense - t * third.rate + waves[3])
          if (hill > 0.01) {
            const [dx, dy] = [px - at[0], py - at[1]]
            h += HILL.high * hill * Math.exp(-(dx * dx + dy * dy) / HILL.wide)
          }
          heights[y * wide + x] = h * LEVELS
        }
      }
      tones.fill(0)
      inks.fill(0)
      for (let y = 1; y < high - 1; y++)
        for (let x = 1; x < wide - 1; x++) {
          const here = y * wide + x
          const v = heights[here]
          const level = Math.round(v)
          const slope =
            Math.hypot(
              (heights[here + 1] - heights[here - 1]) * 0.5,
              (heights[here + wide] - heights[here - wide]) * 0.5,
            ) + 0.0001
          // Every fourth line is drawn heavier, as on a map, and in colour it is the orange one.
          const fourth = level % LINE.every === 0
          const line = LINE.full - Math.abs(v - level) / slope / (fourth ? LINE.heavy : LINE.light)
          if (line <= 0) continue
          const fade =
            FADE.start -
            Math.hypot((x + 0.5) * g - form.x, (y + 0.5) * g - form.y) / (form.r * FADE.reach)
          if (fade > 0) {
            tones[here] = Math.min(1, line) * Math.min(1, fade) * STRENGTH
            if (fourth) inks[here] = ORANGE
          }
        }
    },
  }
}
