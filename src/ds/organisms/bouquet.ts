// Bouquet: stems fan out of one point with a flower on each, buds and sprigs between them, and sparks behind. It turns
// slowly, and a drag turns it. The sparks do not turn: each keeps its place, drifts a little and twinkles. As signs it
// is made the way hand-made ASCII is, every kind of flower from signs of its own.
import { BLUE, type Grid, limb, MINT, ORANGE, PAPER, type Scene, SEED } from './tones'

const DEG = Math.PI / 180
const [ROUND, DAISY, TULIP, ALLIUM, SPIKE, BUD, SPRIG] = [0, 1, 2, 3, 4, 5, 6]
// The twelve flowers, kind by kind.
const KINDS = [ROUND, DAISY, TULIP, ALLIUM, ROUND, SPIKE, DAISY, TULIP, ROUND, SPIKE, ALLIUM, DAISY]
// It is seen a little from above, and is this many pixels tall to a unit.
const TILT = 12 * DEG
const SPAN = 440
// Where its stems meet, as shares of the screen across and down.
const ROOT = [0.7, 0.9]
// It turns this far a tick by itself, and a drag turns it this far for each pixel.
const TURN = 0.004
const DRAG = 0.008
// A flower's stem: each next one round by the golden angle and a little chance, how far it leans from upright, its
// length and the size of its head, the least and what chance adds.
const FLOWER = { q: 2.39996, spread: 0.5, lean: [9, 30], long: [0.8, 0.26], head: [0.062, 0.04] }
const BUDS = { count: 8, lean: [6, 26], long: [0.45, 0.3], head: [0.034, 0.016] }
const SPRIGS = { count: 26, lean: [4, 24], long: [0.22, 0.42] }
// A stem is drawn in this many parts, a sprig's in fewer, and bends out more toward its head; a spike flowers along
// its last part.
const PARTS = { stem: 44, sprig: 16, bend: 0.11, sink: 0.3, spike: 0.7 }
// Forty-six sparks in a shell about the crown, as far as this from it at least and what chance adds, in paper, every
// seventh orange and every fifth blue.
const SPARKS = { count: 46, far: [0.85, 0.5], crown: 0.6, flat: 0.8 }
// A spark drifts this far at these rates across and down, twinkles at this rate, and shows only above this.
const DRIFT = { x: [9, 0.006, 1.3], y: [7, 0.0047, 2.1] }
const TWINKLE = { rate: 0.02, apart: 1.7, shown: -0.45, star: 0.6, plus: 0.05 }
// As ink a spark is a disc this large, at least and what its twinkle adds, and this strong.
const GLINT = { size: [2, 3], shade: [0.45, 0.35] }
// The signs, by their codes.
const SIGN = {
  star: 42,
  plus: 43,
  dot: 46,
  colon: 58,
  dash: 45,
  bar: 124,
  slash: 47,
  back: 92,
  open: 40,
  close: 41,
  zero: 48,
  eight: 56,
  o: 111,
  big: 79,
  at: 64,
}

type Stem = {
  kind: number
  q: number
  lean: number
  long: number
  head: number
  tint: number
  heart: number
}
type Head = { stem: Stem; at: number[]; spike: number[][] | null }

export function bouquet(grid: Grid, width: number, height: number, random: () => number): Scene {
  const { pitch: p, cols, lines } = grid
  const stems: Stem[] = []
  for (let k = 0; k < KINDS.length; k++) {
    const tint = [ORANGE, PAPER, BLUE][k % 3]
    stems.push({
      kind: KINDS[k],
      q: k * FLOWER.q + random() * FLOWER.spread,
      lean: (FLOWER.lean[0] + FLOWER.lean[1] * Math.sqrt((k + 0.5) / KINDS.length)) * DEG,
      long: FLOWER.long[0] + FLOWER.long[1] * random(),
      head: FLOWER.head[0] + FLOWER.head[1] * random(),
      tint,
      heart: tint === PAPER ? ORANGE : PAPER,
    })
  }
  for (let k = 0; k < BUDS.count; k++)
    stems.push({
      kind: BUD,
      q: random() * 6.28,
      lean: (BUDS.lean[0] + BUDS.lean[1] * random()) * DEG,
      long: BUDS.long[0] + BUDS.long[1] * random(),
      head: BUDS.head[0] + BUDS.head[1] * random(),
      tint: k % 2 ? PAPER : MINT,
      heart: PAPER,
    })
  for (let k = 0; k < SPRIGS.count; k++)
    stems.push({
      kind: SPRIG,
      q: random() * 6.28,
      lean: (SPRIGS.lean[0] + SPRIGS.lean[1] * random()) * DEG,
      long: SPRIGS.long[0] + SPRIGS.long[1] * random(),
      head: 0,
      tint: MINT,
      heart: MINT,
    })
  // It first faces the way the seed names.
  let yaw = (SEED % 360) * DEG
  // A spark keeps the place on the screen that it has as the bouquet first stands.
  const [c0, s0] = [Math.cos(yaw), Math.sin(yaw)]
  const sparks = Array.from({ length: SPARKS.count }, (_, k) => {
    const u = random() * 2 - 1
    const q = random() * 6.28
    const r = SPARKS.far[0] + SPARKS.far[1] * random()
    const h = Math.sqrt(1 - u * u)
    const [x, y, z] = [h * Math.cos(q) * r, SPARKS.crown + u * r * SPARKS.flat, h * Math.sin(q) * r]
    return {
      dx: (x * c0 + z * s0) * SPAN,
      dy: -(y * Math.cos(TILT) - (z * c0 - x * s0) * Math.sin(TILT)) * SPAN,
      tint: k % 7 === 0 ? ORANGE : k % 5 === 0 ? BLUE : PAPER,
    }
  })
  const named = new Uint8Array(cols * lines)
  const tints = new Uint8Array(cols * lines)
  const depths = new Float32Array(cols * lines)
  let last: number[] | null = null
  let tick = 0

  // A sign in a cell of the mono face; the nearest to the viewer wins.
  function put(i: number, j: number, code: number, tint: number, depth: number) {
    if (i < 0 || j < 0 || i >= cols || j >= lines) return
    const at = j * cols + i
    if (depth < depths[at]) return
    depths[at] = depth
    named[at] = code
    tints[at] = tint
  }

  // A flower in signs, at the end of its stem.
  function bloomSigns({ stem: m, at, spike }: Head) {
    const [x, y] = at
    const z = at[2] + 0.2
    const R = m.head * SPAN
    const [ci, cj] = [Math.floor(x / p), Math.floor(y / (2 * p))]
    if (m.kind === SPIKE) {
      for (let n = 0; n < spike!.length; n++) {
        const u = n / (spike!.length - 1)
        const [i, j] = [Math.floor(spike![n][0] / p), Math.floor(spike![n][1] / (2 * p))]
        if (u < 0.7) {
          put(i - 1, j, SIGN.o, m.tint, z)
          put(i + 1, j, SIGN.o, m.tint, z)
        }
        put(i, j, u < 0.7 ? SIGN.eight : u < 0.95 ? SIGN.o : SIGN.dot, m.tint, z + 0.01)
      }
      return
    }
    if (m.kind === TULIP) {
      // It stands on the end of its stem: petal tips inside a rim, a cup, a narrower foot.
      const half = Math.min(3, Math.max(2, Math.round((R / p) * 0.55)))
      const tall = half + 1
      for (let r = 0; r < tall; r++)
        for (let c = -half; c <= half; c++) {
          const rim = Math.abs(c) === half
          if (r === tall - 1 && rim) continue
          const cup = (r > 0 && r < tall - 1) || (r === 0 && rim)
          const code =
            c === 0
              ? SIGN.bar
              : cup
                ? c < 0
                  ? SIGN.open
                  : SIGN.close
                : c < 0
                  ? SIGN.back
                  : SIGN.slash
          put(ci + c, cj - tall + 1 + r, code, m.tint, z)
        }
      return
    }
    const [i0, i1] = [Math.floor((x - R) / p), Math.floor((x + R) / p)]
    const [j0, j1] = [Math.floor((y - R * 0.85) / (2 * p)), Math.floor((y + R * 0.85) / (2 * p))]
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * p - x
        const dy = (j + 0.5) * 2 * p - y
        const [nx, ny] = [dx / R, dy / (R * 0.85)]
        const d = nx * nx + ny * ny
        if (d > 1) continue
        if (m.kind === BUD) put(i, j, SIGN.o, m.tint, z)
        else if (m.kind === ROUND)
          put(i, j, d < 0.14 ? SIGN.big : SIGN.zero, d < 0.14 ? m.heart : m.tint, z - d * 0.05)
        else if (m.kind === ALLIUM) {
          if ((i + j) & 1) put(i, j, SIGN.star, m.tint, z)
          else if (d < 0.6) put(i, j, SIGN.dot, m.tint, z)
        } else if (d < 0.1) put(i, j, SIGN.at, m.heart, z)
        else {
          // A ray of the daisy, by the way it points.
          const steep = Math.atan2(Math.abs(dy), Math.abs(dx)) / DEG
          const code =
            steep < 22.5
              ? SIGN.dash
              : steep > 67.5
                ? SIGN.bar
                : dx * dy < 0
                  ? SIGN.slash
                  : SIGN.back
          put(i, j, code, m.tint, z - d * 0.05)
        }
      }
  }

  // The same flower as ink, for the dots.
  function bloomTones({ stem: m, at, spike }: Head) {
    const [x, y] = at
    const R = m.head * SPAN
    const disc = (cx: number, cy: number, r: number, shade: number, tint: number) =>
      limb(grid, [cx, cy], [cx, cy], r, r, shade, tint, true)
    if (m.kind === SPIKE) {
      for (let n = 0; n < spike!.length; n++)
        disc(spike![n][0], spike![n][1], 2 + 5 * (1 - n / (spike!.length - 1)), 1, m.tint)
      return
    }
    if (m.kind === TULIP) {
      limb(grid, [x, y - 1.05 * R], [x, y - 0.35 * R], 0.6 * R, 0.36 * R, 1, m.tint, true)
      for (let side = -1; side <= 1; side += 2)
        limb(
          grid,
          [x + side * 0.4 * R, y - 1.4 * R],
          [x + side * 0.56 * R, y - 1.9 * R],
          0.2 * R,
          0.06 * R,
          1,
          m.tint,
          true,
        )
      return
    }
    if (m.kind === ALLIUM) {
      for (let n = 0; n < 16; n++) {
        const far = 0.9 * R * Math.sqrt((n + 0.5) / 16)
        const q = n * FLOWER.q
        disc(x + Math.cos(q) * far, y + Math.sin(q) * far, 0.17 * R, 0.95, m.tint)
      }
      return
    }
    if (m.kind === DAISY) {
      for (let n = 0; n < 8; n++) {
        const q = (n + 0.5) * 45 * DEG
        const [c, s] = [Math.cos(q), Math.sin(q)]
        limb(
          grid,
          [x + c * 0.25 * R, y + s * 0.25 * R],
          [x + c * 0.9 * R, y + s * 0.9 * R],
          0.1 * R,
          0.19 * R,
          0.85,
          m.tint,
          true,
        )
      }
      disc(x, y, 0.3 * R, 1, m.heart)
      return
    }
    disc(x, y, R, 1, m.tint)
    if (m.kind === ROUND) disc(x, y, R * 0.38, 1, m.heart)
  }

  // The whole bouquet as it stands now, in signs or as ink.
  function lay(signs: boolean) {
    grid.tones.fill(0)
    grid.inks.fill(0)
    if (signs) {
      named.fill(0)
      depths.fill(-1e9)
    }
    const [cy, sy, ct, st] = [Math.cos(yaw), Math.sin(yaw), Math.cos(TILT), Math.sin(TILT)]
    const ox = Math.round((width * ROOT[0]) / p) * p
    const oy = Math.round((height * ROOT[1]) / p) * p
    // A place in the bouquet, on the screen: across, down, and how near it is.
    const see = (x: number, y: number, z: number) => {
      const [x1, z1] = [x * cy + z * sy, z * cy - x * sy]
      return [ox + x1 * SPAN, oy - (y * ct - z1 * st) * SPAN, y * st + z1 * ct]
    }
    // The sparks lie behind everything.
    sparks.forEach((one, k) => {
      const v = Math.sin(tick * TWINKLE.rate + k * TWINKLE.apart)
      if (v < TWINKLE.shown) return
      const x = ox + one.dx + DRIFT.x[0] * Math.sin(tick * DRIFT.x[1] + k * DRIFT.x[2])
      const y = oy + one.dy + DRIFT.y[0] * Math.cos(tick * DRIFT.y[1] + k * DRIFT.y[2])
      if (signs) {
        const code = v > TWINKLE.star ? SIGN.star : v > TWINKLE.plus ? SIGN.plus : SIGN.dot
        put(Math.floor(x / p), Math.floor(y / (2 * p)), code, one.tint, -100)
      } else {
        const size = GLINT.size[0] + GLINT.size[1] * (v - TWINKLE.shown)
        limb(grid, [x, y], [x, y], size, size, GLINT.shade[0] + GLINT.shade[1] * v, one.tint)
      }
    })
    const heads: Head[] = []
    for (const m of stems) {
      const [cq, sq, sl, cl] = [Math.cos(m.q), Math.sin(m.q), Math.sin(m.lean), Math.cos(m.lean)]
      const n = m.kind === SPRIG ? PARTS.sprig : PARTS.stem
      const spike: number[][] | null = m.kind === SPIKE ? [] : null
      let was = see(0, 0, 0)
      for (let a = 1; a <= n; a++) {
        const t = a / n
        const far = m.long * t
        const bend = PARTS.bend * t * t * m.long
        const now = see(
          sl * cq * far + cq * bend,
          cl * far - bend * PARTS.sink,
          sl * sq * far + sq * bend,
        )
        if (signs) {
          // A stem is / | \ by its slope and : where it runs behind; a sprig is + and :.
          const slope = Math.atan2(was[1] - now[1], now[0] - was[0]) / DEG
          const code =
            m.kind === SPRIG
              ? t > 0.55
                ? SIGN.plus
                : SIGN.colon
              : now[2] < -0.02
                ? SIGN.colon
                : slope < 25 || slope > 155
                  ? SIGN.dash
                  : Math.abs(slope - 90) < 20
                    ? SIGN.bar
                    : slope > 90
                      ? SIGN.back
                      : SIGN.slash
          put(Math.floor(now[0] / p), Math.floor(now[1] / (2 * p)), code, MINT, now[2])
        } else
          limb(
            grid,
            [was[0], was[1]],
            [now[0], now[1]],
            1.4,
            1.4,
            m.kind === SPRIG ? 0.35 : now[2] < 0 ? 0.3 : 0.5,
            MINT,
          )
        if (spike && t >= PARTS.spike) spike.push(now)
        was = now
      }
      if (m.kind !== SPRIG) heads.push({ stem: m, at: was, spike })
    }
    // The far flowers first, so the near ones lie over them.
    heads.sort((a, b) => a.at[2] - b.at[2])
    for (const head of heads) (signs ? bloomSigns : bloomTones)(head)
  }

  return {
    step(pointer, held) {
      tick++
      if (held && pointer && last) yaw += (pointer[0] - last[0]) * DRAG
      else if (!held) yaw += TURN
      last = pointer
    },
    paint() {
      lay(false)
    },
    signs() {
      lay(true)
      const all: [string, number, number, number][] = []
      for (let j = 0; j < lines; j++)
        for (let i = 0; i < cols; i++) {
          const code = named[j * cols + i]
          if (code)
            all.push([
              String.fromCharCode(code),
              (i + 0.5) * p,
              (j * 2 + 1) * p,
              tints[j * cols + i],
            ])
        }
      return all
    },
  }
}
