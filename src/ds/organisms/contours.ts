// Contours: the level lines of a slow relief about where the first halftone stood, fading toward its edge. Every
// fourth line is heavier, as on a map, and in colour orange; the pointer raises a hill under it.
import { type Grid, home, ORANGE, PAPER, type Scene } from './tones'

// The relief is a few hills that wander slowly about the middle: how high and how wide against the radius each is,
// at least and what chance adds, how far against the radius they wander, and how fast at most.
const HILLS = { count: 5, high: [0.4, 0.5], wide: [0.3, 0.4], far: 1.3, rate: 0.002 }
// The hill under the pointer: how high and wide, and the share a tick by which it grows, sinks and follows.
const HILL = { high: 0.9, wide: 0.45, ease: 0.04 }
// How many lines to a unit of height, every how-many-th is heavier, and the half width of each in pitches.
const LINES = { per: 5, every: 4, light: 0.3, heavy: 0.6 }
// The lines fade out this many radii from the middle.
const REACH = 2.4

export function contours(grid: Grid, width: number, height: number, random: () => number): Scene {
  const { x, y, r } = home(width, height)
  const hills = Array.from({ length: HILLS.count }, () => ({
    high: HILLS.high[0] + HILLS.high[1] * random(),
    wide: (HILLS.wide[0] + HILLS.wide[1] * random()) * r,
    far: HILLS.far * r * random(),
    rate: HILLS.rate * (random() * 2 - 1),
    at: random() * 6.28,
  }))
  const hill = { x, y, high: 0 }
  const heights = new Float32Array(grid.wide * grid.high)
  let tick = 0

  return {
    step(pointer) {
      tick++
      hill.high += ((pointer ? HILL.high : 0) - hill.high) * HILL.ease
      if (pointer) {
        hill.x += (pointer[0] - hill.x) * HILL.ease
        hill.y += (pointer[1] - hill.y) * HILL.ease
      }
    },
    paint() {
      const { pitch, wide, high, tones, inks } = grid
      const g = pitch / 2
      const all = [
        ...hills.map((one) => ({
          x: x + Math.cos(one.at + tick * one.rate) * one.far,
          y: y + Math.sin(one.at + tick * one.rate) * one.far,
          high: one.high,
          wide: one.wide,
        })),
        { ...hill, wide: HILL.wide * r },
      ]
      for (let sy = 0; sy < high; sy++)
        for (let sx = 0; sx < wide; sx++) {
          let sum = 0
          for (const one of all) {
            const far = ((sx + 0.5) * g - one.x) ** 2 + ((sy + 0.5) * g - one.y) ** 2
            sum += one.high * Math.exp(-far / (2 * one.wide * one.wide))
          }
          heights[sy * wide + sx] = sum * LINES.per
        }
      tones.fill(0)
      inks.fill(0)
      for (let sy = 1; sy < high - 1; sy++)
        for (let sx = 1; sx < wide - 1; sx++) {
          const at = sy * wide + sx
          const level = Math.round(heights[at])
          if (level < 1) continue
          // How far the sample lies from its nearest line, in pixels, by how steep the relief is there.
          const steep = Math.hypot(
            heights[at + 1] - heights[at - 1],
            heights[at + wide] - heights[at - wide],
          )
          const far = (Math.abs(heights[at] - level) * 2 * g) / (steep || 1e-6)
          const heavy = level % LINES.every === 0
          const edge = ((heavy ? LINES.heavy : LINES.light) * pitch - far) / g + 0.5
          const fade = 1 - Math.hypot((sx + 0.5) * g - x, (sy + 0.5) * g - y) / (REACH * r)
          if (edge <= 0 || fade <= 0) continue
          tones[at] = Math.min(1, edge) * Math.min(1, fade * 2)
          inks[at] = heavy ? ORANGE : PAPER
        }
    },
  }
}
