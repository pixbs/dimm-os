// Bouquet: stems fan out of one point low on the right, a flower on each, with buds and sprigs between them. It turns
// slowly, and a drag across the screen turns it once round. Sparks stand behind it and do not turn with it.
import { BLUE, type Grid, home, limb, MINT, ORANGE, PAPER, type Scene } from './tones'

// The twelve flowers, each its kind and its ink.
const FLOWERS = [
  ['round', ORANGE],
  ['daisy', PAPER],
  ['tulip', BLUE],
  ['allium', ORANGE],
  ['spike', BLUE],
  ['round', PAPER],
  ['daisy', ORANGE],
  ['tulip', PAPER],
  ['allium', BLUE],
  ['spike', ORANGE],
  ['round', BLUE],
  ['daisy', PAPER],
] as const
type Kind = (typeof FLOWERS)[number][0] | 'bud'
const [BUDS, SPRIGS, SPARKS] = [8, 26, 46]
// How tall it stands against the height and the width of the screen, whichever is less, and where its stems meet,
// as a share of the height.
const SIZE = { high: 0.78, wide: 0.8, low: 0.96 }
// A stem leans out from upright, in radians, and is long against the size: the least and what chance adds; a bud's
// is shorter. It bends out more toward its head.
const STEM = { lean: [0.12, 0.62], long: [0.62, 0.38], bud: 0.75, bend: 1.25, parts: 10 }
// It is seen a little from above: a near part stands lower by this share of how near it is.
const ABOVE = 0.22
// It turns once round in this many ticks by itself.
const ROUND = 3600
// Half the width of a head in pitches, kind by kind.
const HEAD = { round: 3, daisy: 3.5, tulip: 3, allium: 3, spike: 2.5, bud: 1.2 }
// A sprig leaves a stem this far along it, the least and what chance adds, and is this long against the size.
const SPRIG = { at: [0.35, 0.5], long: 0.07 }
// The sparks lie in an oval about the crown, as wide and high as these shares of the size; each drifts this many
// pixels at this rate, and twinkles at this rate at most.
const SPARK = { wide: 0.8, high: 0.5, crown: 0.7, drift: 3, rate: 0.01, twinkle: 0.06 }
// The sign of a spark from bright to faint, each from how bright it is at least; fainter, it is not seen.
const TWINKLE: [number, string][] = [
  [0.85, '*'],
  [0.6, '+'],
  [0.3, '.'],
]
// A stem is | within this slope of upright, and / or \ beyond it.
const UPRIGHT = 0.25

type Point = [number, number, number]
type Put = (x: number, y: number, near: number, sign: string, ink: number) => void

export function bouquet(grid: Grid, width: number, height: number, random: () => number): Scene {
  const { pitch } = grid
  const size = Math.min(height * SIZE.high, width * SIZE.wide)
  const [bx, by] = [home(width, height).x, height * SIZE.low]
  const turning = (Math.PI * 2) / ROUND
  // A flower or a bud at the end of each stem, spread round by the golden angle.
  const stems = [...FLOWERS, ...Array.from({ length: BUDS }, () => ['bud', MINT] as const)].map(
    ([kind, ink], index) => {
      const lean = STEM.lean[0] + STEM.lean[1] * random()
      const long = (STEM.long[0] + STEM.long[1] * random()) * size * (kind === 'bud' ? STEM.bud : 1)
      return { kind: kind as Kind, ink, lean, long, round: index * 2.39996 + random() }
    },
  )
  const sprigs = Array.from({ length: SPRIGS }, () => {
    const stem = stems[Math.floor(random() * stems.length)]
    const round = stem.round + (random() - 0.5) * 2
    const long = SPRIG.long * size * (0.6 + random() * 0.8)
    return {
      stem,
      at: SPRIG.at[0] + SPRIG.at[1] * random(),
      out: [Math.cos(round), Math.sin(round)],
      long,
    }
  })
  const sparks = Array.from({ length: SPARKS }, () => {
    const [a, far] = [random() * 6.28, Math.sqrt(random())]
    return {
      x: bx + Math.cos(a) * far * SPARK.wide * size,
      y: by - SPARK.crown * size + Math.sin(a) * far * SPARK.high * size,
      phase: random() * 6.28,
      rate: SPARK.twinkle * (0.4 + random() * 0.6),
    }
  })
  let turn = 0
  let tick = 0
  let held: number[] | null = null

  // A point of a stem, this far along it, in the bouquet's own space: across, up and toward the eye.
  const along = (stem: (typeof stems)[number], share: number): Point => {
    const out = stem.long * Math.sin(stem.lean) * share ** STEM.bend
    return [
      Math.cos(stem.round) * out,
      -stem.long * Math.cos(stem.lean) * share,
      Math.sin(stem.round) * out,
    ]
  }
  // Where a point stands on the screen as the bouquet has turned, and how near it is.
  const seen = ([x, y, z]: Point) => {
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)]
    const near = z * cos - x * sin
    return [bx + x * cos + z * sin, by + y + near * ABOVE, near]
  }
  const sprigEnd = (sprig: (typeof sprigs)[number]): Point => {
    const [x, y, z] = along(sprig.stem, sprig.at)
    const l = sprig.long * Math.SQRT1_2
    return [x + sprig.out[0] * l, y - l, z + sprig.out[1] * l]
  }
  const spark = (one: (typeof sparks)[number]) => [
    one.x + Math.sin(tick * SPARK.rate + one.phase) * SPARK.drift,
    one.y + Math.cos(tick * SPARK.rate * 0.8 + one.phase * 2) * SPARK.drift,
    0.5 + 0.5 * Math.sin(tick * one.rate + one.phase),
  ]

  // Each part of the bouquet with how near it is, drawn in dots or set in signs.
  function parts(draw: {
    line(a: number[], b: number[], ink: number, sprig: boolean): void
    head(kind: Kind, at: number[], up: number[], ink: number): void
  }) {
    for (const stem of stems) {
      for (let n = 0; n < STEM.parts; n++)
        draw.line(
          seen(along(stem, n / STEM.parts)),
          seen(along(stem, (n + 1) / STEM.parts)),
          MINT,
          false,
        )
      const [tip, below] = [seen(along(stem, 1)), seen(along(stem, 0.9))]
      const l = Math.hypot(tip[0] - below[0], tip[1] - below[1]) || 1
      draw.head(stem.kind, tip, [(tip[0] - below[0]) / l, (tip[1] - below[1]) / l], stem.ink)
    }
    for (const sprig of sprigs)
      draw.line(seen(along(sprig.stem, sprig.at)), seen(sprigEnd(sprig)), MINT, true)
  }

  return {
    step(pointer, press) {
      tick++
      turn += turning
      if (press && pointer && held) turn += ((pointer[0] - held[0]) / width) * Math.PI * 2
      held = press ? pointer : null
    },
    // In dots, far parts first, so a near one takes the ink where they meet.
    paint() {
      grid.tones.fill(0)
      grid.inks.fill(0)
      for (const one of sparks) {
        const [x, y, bright] = spark(one)
        limb(grid, [x, y], [x, y], pitch * 0.55, pitch * 0.55, bright, PAPER)
      }
      const queue: [number, () => void][] = []
      const stroke = pitch * 0.3
      parts({
        line: (a, b, ink, sprig) =>
          queue.push([
            (a[2] + b[2]) / 2,
            () => {
              limb(grid, a, b, stroke, stroke, 0.8, ink, true)
              if (sprig) limb(grid, b, b, stroke * 2.2, stroke * 2.2, 0.9, ink, true)
            },
          ]),
        head: (kind, at, up, ink) => queue.push([at[2] + 1, () => dotted(grid, kind, at, up, ink)]),
      })
      for (const [, draw] of queue.sort(([a], [b]) => a - b)) draw()
    },
    // In signs, each cell holds the sign of its nearest part.
    signs() {
      const cells = new Map<number, [string, number, number, number, number]>()
      const put: Put = (x, y, near, sign, ink) => {
        const [col, line] = [Math.floor(x / pitch), Math.floor(y / (pitch * 2))]
        if (col < 0 || col >= grid.cols || line < 0 || line >= grid.lines) return
        const key = line * grid.cols + col
        if ((cells.get(key)?.[4] ?? -Infinity) <= near)
          cells.set(key, [sign, (col + 0.5) * pitch, (line * 2 + 1) * pitch, ink, near])
      }
      for (const one of sparks) {
        const [x, y, bright] = spark(one)
        const sign = TWINKLE.find(([least]) => bright >= least)?.[1]
        if (sign) put(x, y, -Infinity, sign, PAPER)
      }
      parts({
        line: (a, b, ink, sprig) => {
          const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (pitch / 2))
          const slope = (b[0] - a[0]) / (a[1] - b[1] || 1e-6)
          const sign = Math.abs(slope) < UPRIGHT ? '|' : slope > 0 ? '/' : '\\'
          for (let n = 0; n <= steps; n++) {
            const t = n / steps
            const near = a[2] + (b[2] - a[2]) * t
            const mark = sprig ? (n === steps || n % 3 === 1 ? '+' : ':') : near < 0 ? ':' : sign
            put(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near, mark, ink)
          }
        },
        head: (kind, at, up, ink) => signed(put, pitch, kind, at, up, ink),
      })
      return [...cells.values()].map(([sign, x, y, ink]) => [sign, x, y, ink])
    },
  }
}

// A head poured as ink: a disc with a heart, eight petals about a heart, a cup with two tips, a ball of small spots,
// discs up the end of a stem, or a bud.
function dotted(grid: Grid, kind: Kind, [x, y]: number[], [ux, uy]: number[], ink: number) {
  const r = HEAD[kind] * grid.pitch
  const disc = (dx: number, dy: number, radius: number, shade: number) =>
    limb(grid, [x + dx, y + dy], [x + dx, y + dy], radius, radius, shade, ink, true)
  if (kind === 'round') disc(0, 0, r, 0.6)
  if (kind === 'daisy')
    for (let n = 0; n < 8; n++) {
      const [cos, sin] = [Math.cos((n * Math.PI) / 4), Math.sin((n * Math.PI) / 4)]
      limb(
        grid,
        [x + cos * r * 0.42, y + sin * r * 0.42],
        [x + cos * r, y + sin * r],
        r * 0.2,
        r * 0.13,
        0.9,
        ink,
        true,
      )
    }
  if (kind === 'tulip') {
    limb(grid, [x, y + r * 0.5], [x, y - r * 0.15], r * 0.45, r * 0.7, 0.9, ink, true)
    for (const side of [-1, 1])
      limb(
        grid,
        [x + side * r * 0.4, y - r * 0.2],
        [x + side * r * 0.6, y - r * 0.85],
        r * 0.25,
        r * 0.08,
        0.9,
        ink,
        true,
      )
  }
  if (kind === 'allium')
    for (let n = 0; n < 19; n++) {
      const [a, far] = [n * 2.39996, r * 0.85 * Math.sqrt((n + 0.5) / 19)]
      disc(Math.cos(a) * far, Math.sin(a) * far, r * 0.14, 1)
    }
  if (kind === 'spike')
    for (let n = 0; n < 5; n++)
      disc(-ux * n * r * 0.45, -uy * n * r * 0.45, r * (0.2 + n * 0.04), 1)
  if (kind === 'bud') disc(0, 0, r, 0.9)
  if (kind === 'round' || kind === 'daisy') disc(0, 0, r * (kind === 'round' ? 0.4 : 0.3), 1)
}

// A head set in signs of its kind's own, as hand-made ASCII is: a block of 0 about an O, rays about an @, a cup of
// ( | ) with petal tips inside its rim, a ball of * and ., o8o up the end of a stem, or a knot of o.
function signed(
  put: Put,
  pitch: number,
  kind: Kind,
  [x, y, z]: number[],
  [ux, uy]: number[],
  ink: number,
) {
  const r = HEAD[kind] * pitch
  const near = z + 1
  const w = Math.max(1, Math.round(r / pitch) - 1)
  const at = (col: number, line: number, sign: string) =>
    put(x + col * pitch, y + line * pitch * 2, near, sign, ink)
  if (kind === 'spike') {
    at(0, 0, '8')
    for (let n = 1; n <= 2; n++)
      for (const col of [-1, 0, 1])
        put(
          x - ux * n * pitch * 2 + col * pitch,
          y - uy * n * pitch * 2,
          near,
          col ? 'o' : '8',
          ink,
        )
    return
  }
  if (kind === 'tulip') {
    for (const [line, half] of [
      [-1, w],
      [0, w],
      [1, w - 1],
    ])
      for (let col = -half; col <= half; col++)
        at(col, line, col === -half ? '(' : col === half ? ')' : line < 0 && col % 2 ? '^' : '|')
    return
  }
  if (kind === 'bud') {
    for (const [col, line] of [
      [-1, 0],
      [0, 0],
      [1, 0],
      [0, -1],
    ])
      at(col, line, 'o')
    return
  }
  for (let line = -Math.ceil(r / pitch / 2); line <= r / pitch / 2; line++)
    for (let col = -Math.ceil(r / pitch); col <= r / pitch; col++) {
      const [dx, dy] = [col * pitch, line * pitch * 2]
      const far = Math.hypot(dx, dy)
      if (far > r) continue
      if (kind === 'round') at(col, line, far ? '0' : 'O')
      if (kind === 'allium') at(col, line, (col + line) % 2 ? '.' : '*')
      if (kind === 'daisy') {
        // Each cell on one of the eight rays takes the sign of its slope.
        const ray = Math.round(Math.atan2(dy, dx) / (Math.PI / 4))
        const off = Math.abs(
          dx * Math.sin((ray * Math.PI) / 4) - dy * Math.cos((ray * Math.PI) / 4),
        )
        if (!far) at(col, line, '@')
        else if (off < pitch * 0.75) at(col, line, '-\\|/'[((ray % 4) + 4) % 4])
      }
    }
}
