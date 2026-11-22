// The grid every wallpaper pours its ink into: two samples to the pitch each way, a tone and an ink for each.
// It touches no page, so a worker fills it and a test reads it.

// The four inks a sample can name.
export const PAPER = 0
export const ORANGE = 1
export const BLUE = 2
export const MINT = 3

export type Grid = {
  pitch: number
  // How many dots, rows of dots and lines of signs the screen holds.
  cols: number
  rows: number
  lines: number
  // The samples across and down, and what each holds.
  wide: number
  high: number
  tones: Float32Array
  inks: Uint8Array
}

export function grid(width: number, height: number, pitch: number): Grid {
  const cols = Math.ceil(width / pitch)
  const rows = Math.ceil(height / pitch)
  const samples = cols * rows * 4
  return {
    pitch,
    cols,
    rows,
    lines: Math.floor(rows / 2),
    wide: cols * 2,
    high: rows * 2,
    tones: new Float32Array(samples),
    inks: new Uint8Array(samples),
  }
}

// The tone at the edge of a rounded body, against the full tone of its middle.
const EDGE = 0.62

// A capsule from a to b whose radius runs from ra to rb, rounded like a body: full in its middle, fainter at its
// edge. Laid over what is there, it also colours what it does not outshine.
export function limb(
  { pitch, wide, high, tones, inks }: Grid,
  [ax, ay]: number[],
  [bx, by]: number[],
  ra: number,
  rb: number,
  shade: number,
  ink: number,
  over = false,
) {
  const g = pitch / 2
  const pad = Math.max(ra, rb) + g
  const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad) / g))
  const x1 = Math.min(wide - 1, Math.ceil((Math.max(ax, bx) + pad) / g))
  const y0 = Math.max(0, Math.floor((Math.min(ay, by) - pad) / g))
  const y1 = Math.min(high - 1, Math.ceil((Math.max(ay, by) + pad) / g))
  const dx = bx - ax
  const dy = by - ay
  const length = dx * dx + dy * dy || 1
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = (x + 0.5) * g - ax
      const py = (y + 0.5) * g - ay
      const t = Math.min(1, Math.max(0, (px * dx + py * dy) / length))
      const r = ra + (rb - ra) * t
      const far = Math.hypot(px - dx * t, py - dy * t)
      const edge = (r - far) / g + 0.5
      if (edge <= 0) continue
      const middle = r > 0 ? Math.max(0, 1 - (far / r) ** 2) : 0
      const tone = shade * Math.min(1, edge) * (EDGE + (1 - EDGE) * middle)
      const at = y * wide + x
      if (tone > tones[at]) {
        tones[at] = tone
        inks[at] = ink
      } else if (over && edge > 0.5) inks[at] = ink
    }
}

// What is left to chance comes from one seeded source, the same each time.
export function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
