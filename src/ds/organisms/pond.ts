// Pond: rain on still water, by the wave equation on the pitch grid. A drop falls now and then, more often near where
// the first halftone stood; the pointer leaves a wake as it moves, and a press is a stone. It has no colours.
import { type Grid, home, PAPER, type Scene } from './tones'

// A wave keeps this share of itself each tick.
const KEEP = 0.996
// A drop falls with this chance a tick, this share of the time within this many radii of the middle; it is this
// deep and this many dots wide.
const RAIN = { chance: 0.03, near: 0.6, within: 1.2, deep: 1.5, wide: 1.5 }
// The pointer pushes the water this deep for each pixel it moves, at most this deep, this many dots wide.
const WAKE = { deep: 0.04, most: 0.8, wide: 1.5 }
const STONE = { deep: 8, wide: 2.5 }
// The rain has fallen this many ticks before the pond is first drawn, so a pond that holds still is not empty.
const BEFORE = 240
// Water less than this far from still shows nothing, and this much farther it is a full tone.
const CALM = 0.08
const FULL = 0.35

export function pond(grid: Grid, width: number, height: number, random: () => number): Scene {
  const { pitch, cols, rows } = grid
  const middle = home(width, height)
  let now = new Float32Array(cols * rows)
  let was = new Float32Array(cols * rows)
  let last: number[] | null = null
  let held = false

  // Pushes the water down in a round dip, deepest in its middle.
  function push(x: number, y: number, deep: number, wide: number) {
    const [col, row] = [x / pitch - 0.5, y / pitch - 0.5]
    for (let r = Math.ceil(row - wide); r <= row + wide; r++)
      for (let c = Math.ceil(col - wide); c <= col + wide; c++) {
        const far = Math.hypot(c - col, r - row) / wide
        if (far < 1 && r > 0 && r < rows - 1 && c > 0 && c < cols - 1)
          now[r * cols + c] -= deep * (1 - far)
      }
  }

  function step(pointer: number[] | null, press: boolean) {
    if (random() < RAIN.chance) {
      const near = random() < RAIN.near
      const [a, far] = [random() * 6.28, Math.sqrt(random()) * middle.r * RAIN.within]
      push(
        near ? middle.x + Math.cos(a) * far : random() * width,
        near ? middle.y + Math.sin(a) * far : random() * height,
        RAIN.deep,
        RAIN.wide,
      )
    }
    if (pointer && last) {
      const moved = Math.hypot(pointer[0] - last[0], pointer[1] - last[1])
      if (moved) push(pointer[0], pointer[1], Math.min(WAKE.most, moved * WAKE.deep), WAKE.wide)
    }
    if (pointer && press && !held) push(pointer[0], pointer[1], STONE.deep, STONE.wide)
    last = pointer
    held = press
    // Each dot moves toward the mean of its four neighbours and away from where it was; the edge stays still.
    for (let r = 1; r < rows - 1; r++)
      for (let c = 1; c < cols - 1; c++) {
        const at = r * cols + c
        was[at] =
          ((now[at - 1] + now[at + 1] + now[at - cols] + now[at + cols]) / 2 - was[at]) * KEEP
      }
    ;[now, was] = [was, now]
  }
  for (let tick = 0; tick < BEFORE; tick++) step(null, false)

  return {
    step,
    // Each sample takes the water between the four dots about it.
    paint() {
      const { wide, high, tones, inks } = grid
      inks.fill(PAPER)
      for (let sy = 0; sy < high; sy++)
        for (let sx = 0; sx < wide; sx++) {
          const [x, y] = [Math.max(0, (sx - 0.5) / 2), Math.max(0, (sy - 0.5) / 2)]
          const [c, r] = [Math.min(cols - 2, Math.floor(x)), Math.min(rows - 2, Math.floor(y))]
          const [ax, ay] = [Math.min(1, x - c), Math.min(1, y - r)]
          const at = r * cols + c
          const water =
            (now[at] * (1 - ax) + now[at + 1] * ax) * (1 - ay) +
            (now[at + cols] * (1 - ax) + now[at + cols + 1] * ax) * ay
          tones[sy * wide + sx] = Math.min(1, Math.max(0, Math.abs(water) - CALM) / FULL)
        }
    },
  }
}
