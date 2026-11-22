// Pond: rain on still water, by the wave equation on the pitch grid. A drop falls now and then, more often near where
// the first halftone stood; the pointer leaves a wake as it moves, and a press is a stone. It has no colours.
import { type Grid, home, type Scene } from './tones'

// A drop: how many ticks before the first, how far it falls from home across and down at most, how near an edge,
// how deep, and how many ticks to the next, at least and what chance adds.
const DROP = { first: 20, across: 760, down: 520, edge: 30, deep: 2.6, least: 30, more: 70 }
// The pointer leaves a wake this deep while it moves faster than a pixel a tick; a press is a stone this deep.
const WAKE = { deep: 0.45, faster: 1 }
const STONE = 6
// How fast the pointer moves: each move counts for half, and it slows to this share a tick.
const SLOW = 0.8
// How far a poke reaches, in dots, and how wide it is.
const REACH = 2
const WIDE = 2.2
// A wave pulls toward its neighbours by this share and keeps this share of itself a tick.
const PULL = 0.24
const KEEP = 0.988
// How deep water shows as a full tone, and what is too shallow to show.
const TONE = { full: 2.07, calm: 0.1 }

export function pond(grid: Grid, width: number, height: number, random: () => number): Scene {
  const { pitch, cols, rows } = grid
  const form = home(width, height, pitch)
  let now = new Float32Array(cols * rows)
  let was = new Float32Array(cols * rows)
  let drop = DROP.first
  let last: number[] | null = null
  let vx = 0
  let vy = 0
  let held = false

  const keep = (value: number, least: number, most: number) =>
    value < least ? least : value > most ? most : value
  // Water pushed up in a round bump on the dots about a place, highest in its middle.
  function poke(x: number, y: number, much: number) {
    const [cx, cy] = [Math.round(x / pitch), Math.round(y / pitch)]
    for (let j = -REACH; j <= REACH; j++)
      for (let i = -REACH; i <= REACH; i++) {
        const [col, row] = [cx + i, cy + j]
        if (col < 1 || row < 1 || col >= cols - 1 || row >= rows - 1) continue
        now[row * cols + col] += much * Math.exp(-(i * i + j * j) / WIDE)
      }
  }

  return {
    step(pointer, press) {
      if (pointer && press && !held) poke(pointer[0], pointer[1], STONE)
      held = press
      if (pointer && last && (pointer[0] !== last[0] || pointer[1] !== last[1])) {
        vx = vx * 0.5 + (pointer[0] - last[0]) * 0.5
        vy = vy * 0.5 + (pointer[1] - last[1]) * 0.5
      }
      last = pointer
      vx *= SLOW
      vy *= SLOW
      if (--drop <= 0) {
        const near = () => random() + random() + random() - 1.5
        const x = keep(form.x + near() * DROP.across, DROP.edge, width - DROP.edge)
        const y = keep(form.y + near() * DROP.down, DROP.edge, height - DROP.edge)
        poke(x, y, DROP.deep)
        drop = DROP.least + Math.floor(random() * DROP.more)
      }
      if (pointer && Math.hypot(vx, vy) > WAKE.faster) poke(pointer[0], pointer[1], WAKE.deep)
      for (let row = 1; row < rows - 1; row++)
        for (let col = 1; col < cols - 1; col++) {
          const at = row * cols + col
          was[at] =
            (2 * now[at] -
              was[at] +
              PULL * (now[at - 1] + now[at + 1] + now[at - cols] + now[at + cols] - 4 * now[at])) *
            KEEP
        }
      ;[now, was] = [was, now]
    },
    // Each sample shows the dot it lies on.
    paint() {
      const { wide, high, tones } = grid
      grid.inks.fill(0)
      for (let y = 0; y < high; y++)
        for (let x = 0; x < wide; x++) {
          const water = now[Math.min(rows - 1, y >> 1) * cols + Math.min(cols - 1, x >> 1)]
          tones[y * wide + x] = keep(water * TONE.full - TONE.calm, 0, 1)
        }
    },
  }
}
