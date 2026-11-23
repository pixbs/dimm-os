import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { draw } from '@/card'
import { ShareCard } from '@/ds/organisms/ShareCard'

const faces = path.resolve('src/ds/atoms/faces')
const sheet = path.resolve('src/ds/atoms/tokens.css')
const token = (name: string) => readFileSync(sheet, 'utf8').match(`--${name}: ([^;]+);`)![1]

// The samples a reviewer holds against the design, kept as files where test output goes.
const kept = path.resolve('test-results/cards')
const picture = {
  src: `data:image/jpeg;base64,${readFileSync('src/ds/catalogue/picture.jpg').toString('base64')}`,
  at: '50% 50%',
}
const samples = {
  'window-picture-en': { title: 'Grow', text: null, window: { headline: 'Grow', picture } },
  'window-picture-de': { title: 'Wachsen', text: null, window: { headline: 'Wachsen', picture } },
  'window-words-en': {
    title: 'Field',
    text: 'A description long enough to run over the three lines a card gives it, so that the line that is cut ends in an ellipsis: one more sentence follows it here, and another one after that, and then a last one that no card shows to its end.',
    window: {
      headline: 'Which question does the item answer, in a line long enough to be cut after two?',
      picture: null,
    },
  },
  'window-words-de': {
    title: 'Lebenslauf',
    text: 'Ein Beispielfenster für ein Dokument, auf Papier gezeichnet.',
    window: { headline: 'Größe, Maße, Übung', paper: true, picture: null },
  },
  'desk-en': { title: 'Dimm OS', text: 'A portfolio built as an operating system.' },
  'desk-de': { title: 'Dimm OS', text: 'Ein Portfolio, gebaut als Betriebssystem.' },
}

describe('the card of a shared link', () => {
  it.each(Object.entries(samples))('draws %s as a PNG of 1200 × 630', async (name, shown) => {
    const window = 'window' in shown ? { paper: false, ...shown.window } : undefined
    const png = await draw({ ...shown, window })
    mkdirSync(kept, { recursive: true })
    writeFileSync(path.join(kept, `${name}.png`), png)

    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })

  it('reads its faces as ttf, otf or woff, within 500 KB together with the tokens', () => {
    const files = readdirSync(faces)
    expect(files.filter((file) => !/\.(ttf|otf|woff)$/.test(file))).toEqual([])
    const sizes = [sheet, ...files.map((file) => path.join(faces, file))].map(
      (file) => statSync(file).size,
    )
    expect(sizes.reduce((sum, size) => sum + size)).toBeLessThanOrEqual(500_000)
  })

  it('takes its colours and sizes from the tokens file, twice as large, and a paper record its paper', () => {
    const window = { headline: 'Card', paper: false, picture: null }
    const [desk, record] = [window, { ...window, paper: true }].map(
      (window) => ShareCard({ title: 'Card', text: null, window }).props,
    )
    expect(desk.style).toMatchObject({
      width: 1200,
      height: 630,
      backgroundColor: token('ink-1'),
      color: token('paper-1'),
    })
    const [, frame] = desk.children
    expect(frame.props.style).toMatchObject({
      margin: parseFloat(token('s-6')) * 2,
      backgroundColor: token('ink-2'),
    })
    expect(record.children[1].props.style.backgroundColor).toBe(token('paper-1'))
  })
})
