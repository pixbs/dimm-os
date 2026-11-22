// The two filters a wallpaper is drawn through. Each reads the grid of tones and says what to draw where, and in
// which of the four inks.
import type { Grid } from './tones'

// A dot under this radius is not drawn.
const NONE = 0.3

// Dots: one to the pitch, in a square grid, as wide as the mean tone of its four samples times the pitch, so two
// full dots touch. It takes the ink of the strongest of the four. Each is its middle, its radius and its ink.
export function dots({ pitch, cols, rows, wide, tones, inks }: Grid) {
  const all: number[][] = []
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const at = row * 2 * wide + col * 2
      const [a, b, c, d] = [tones[at], tones[at + 1], tones[at + wide], tones[at + wide + 1]]
      const radius = (Math.min(1, (a + b + c + d) / 4) * pitch) / 2
      if (radius <= NONE) continue
      const most = Math.max(a, b, c, d)
      const ink =
        inks[most === a ? at : most === b ? at + 1 : most === c ? at + wide : at + wide + 1]
      all.push([(col + 0.5) * pitch, (row + 0.5) * pitch, radius, ink])
    }
  return all
}

// The mono face stands at this share of the pitch, and a cell with less ink than this in its fullest part is empty.
export const SIZE = 1.625
const EMPTY = 0.05
// The light parts of a cell are made lighter against its fullest one, so an edge stays an edge.
const SHARPEN = 1.5
// Until the face has loaded, these stand in, from no ink to full.
const RAMP = ' .:-=+*#%@'

// A sign of the face, with how much ink it puts in the eight parts of its cell: two across, four down, each counted
// against the fullest sign in it.
export type Face = { sign: string; parts: number[] }[]

// ASCII: a cell is one pitch wide and two high, and its sign is the one whose shape fits the ink best. Each is the
// sign, the middle of its cell and its ink.
export function ascii(face: Face | null) {
  const chosen = new Map<number, string>()
  const part = new Array<number>(8)

  return ({ pitch, cols, lines, wide, tones, inks }: Grid) => {
    const all: [string, number, number, number][] = []
    for (let line = 0; line < lines; line++)
      for (let col = 0; col < cols; col++) {
        let most = 0
        let sum = 0
        let ink = 0
        for (let n = 0; n < 8; n++) {
          const at = (line * 4 + (n >> 1)) * wide + col * 2 + (n & 1)
          part[n] = tones[at]
          sum += part[n]
          if (part[n] > most) {
            most = part[n]
            ink = inks[at]
          }
        }
        if (most < EMPTY) continue
        let sign = RAMP[Math.max(1, Math.round((sum / 8) * (RAMP.length - 1)))]
        if (face) {
          let key = 0
          for (let n = 0; n < 8; n++) {
            const step = Math.min(7, Math.floor((part[n] / most) ** SHARPEN * most * 8))
            part[n] = step / 7
            key = key * 8 + step
          }
          const fits = (one: Face[number]) =>
            one.parts.reduce((far, full, n) => far + (full - part[n]) ** 2, 0)
          if (!chosen.has(key))
            chosen.set(key, face.reduce((best, one) => (fits(one) < fits(best) ? one : best)).sign)
          sign = chosen.get(key)!
        }
        if (sign !== ' ') all.push([sign, (col + 0.5) * pitch, (line * 2 + 1) * pitch, ink])
      }
    return all
  }
}
