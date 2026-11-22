import { describe, expect, it } from 'vitest'

import { catfish } from '@/ds/organisms/catfish'
import { dragonflies } from '@/ds/organisms/dragonflies'
import { ascii, dots } from '@/ds/organisms/filters'
import { koi } from '@/ds/organisms/koi'
import { BLUE, grid, limb, ORANGE, PAPER, seeded } from '@/ds/organisms/tones'
import { following, step, stepAt, steps, wallpapers } from '@/ds/organisms/wallpapers'

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

  it('steps the dial through each wallpaper in turn: in colour first, dots before signs', () => {
    expect(steps.slice(0, 4)).toEqual([
      'passage dots colour',
      'passage dots',
      'passage ascii colour',
      'passage ascii',
    ])
    const each = Object.values(wallpapers).map((colours) => (colours ? 4 : 2))
    expect(steps).toHaveLength(each.reduce((all, one) => all + one, 0))
    expect(stepAt('301')).toBe(0)
    expect(stepAt('passage ascii')).toBe(3)
  })

  it('offers Catfish in dots and in signs, never in colour', () => {
    expect(steps.filter((one) => one.startsWith('catfish'))).toEqual([
      'catfish dots',
      'catfish ascii',
    ])
  })

  it.each([
    ['koi', koi],
    ['dragonflies', dragonflies],
    ['catfish', catfish],
  ])('pours the same ink into %s after the same ticks from the same start', (_, scene) => {
    const run = () => {
      const tones = grid(400, 300, 8)
      const shown = scene(tones, 400, 300, seeded(299))
      for (let tick = 0; tick < 240; tick++) shown.step(tick < 120 ? [200, 150] : null)
      shown.paint(true)
      return tones
    }
    const [one, two] = [run(), run()]
    expect(one.tones.some((tone) => tone > 0)).toBe(true)
    expect(two.tones).toEqual(one.tones)
    expect(two.inks).toEqual(one.inks)
  })
})

describe('the next wallpaper', () => {
  it('keeps the filter and the colour where the next has colours, and comes back to the first after the last', () => {
    const names = Object.keys(wallpapers) as (keyof typeof wallpapers)[]
    names.forEach((name, at) => {
      const next = names[(at + 1) % names.length]
      expect(following(`${name} ascii colour`)).toBe(
        `${next} ascii${wallpapers[name] && wallpapers[next] ? ' colour' : ''}`,
      )
      expect(following(`${name} dots`)).toBe(`${next} dots`)
    })
  })

  it('goes from Koi, ASCII, in colour to Dragonflies in ASCII and in colour, and from colour to one without', () => {
    expect(following('koi ascii colour')).toBe('dragonflies ascii colour')
    expect(following('dragonflies dots colour')).toBe('catfish dots')
  })

  it('reads the field number of an earlier visit as the step it shows', () => {
    expect(following('301')).toBe(following('passage dots colour'))
  })
})
