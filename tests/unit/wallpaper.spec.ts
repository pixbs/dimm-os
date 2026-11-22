import { describe, expect, it } from 'vitest'

import { ascii, dots } from '@/ds/organisms/filters'
import { BLUE, grid, limb, ORANGE, PAPER } from '@/ds/organisms/tones'
import { step } from '@/ds/organisms/wallpapers'

// A few signs of the mono face as it measures at a pitch of 8: the ink in the eight parts of a cell.
const face = [
  { sign: ' ', parts: [0, 0, 0, 0, 0, 0, 0, 0] },
  { sign: '-', parts: [0, 0, 0.3, 0.31, 0, 0, 0, 0] },
  { sign: '@', parts: [0.64, 0.68, 0.79, 0.94, 0.95, 0.69, 0.89, 0.39] },
  { sign: '|', parts: [0.39, 0.42, 0.31, 0.34, 0.37, 0.32, 0.17, 0.19] },
]

describe('the wallpaper', () => {
  it('draws full ink as a dot as wide as the pitch, and no ink as none', () => {
    const tones = grid(16, 8, 8)
    tones.tones.set([1, 1], 0)
    tones.tones.set([1, 1], tones.wide)
    expect(dots(tones)).toEqual([[4, 4, 4, PAPER]])
  })

  it('gives a dot the ink of the strongest of its four samples', () => {
    const tones = grid(8, 8, 8)
    tones.tones.set([0.2, 0.9, 0.4, 0.1])
    tones.inks.set([ORANGE, BLUE, ORANGE, ORANGE])
    expect(dots(tones)[0][3]).toBe(BLUE)
  })

  it('draws a vertical stroke of ink as |, and an empty cell as no sign', () => {
    const tones = grid(16, 16, 8)
    limb(tones, [4, -8], [4, 24], 2, 2, 1, PAPER)
    expect(ascii(face)(tones)).toEqual([['|', 4, 8, PAPER]])
  })

  it('reads a field number stored by an earlier visit as the default step', () => {
    const passage = { wallpaper: 'passage', filter: 'dots', colour: true }
    expect(step('301')).toEqual(passage)
    expect(step(null)).toEqual(passage)
    expect(step('passage ascii')).toEqual({ ...passage, filter: 'ascii', colour: false })
  })
})
