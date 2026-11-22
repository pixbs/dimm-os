// The wallpaper: one engine for every scene, in a worker so the page never waits for it. A scene pours ink into the
// grid of tones, and the grid is drawn through the filter of the step that is shown.
import { TICK } from '../motion/engine'
import { ascii, dots, type Face, SIZE } from './filters'
import { passage } from './passage'
import { type Grid, grid as tones, seeded } from './tones'
import type { Step } from './wallpapers'

// What the page tells it, in CSS pixels: a message may carry any part of it.
export type Setting = {
  width: number
  height: number
  ratio: number
  pitch: number
  step: Step
  // Paper, orange, blue and mint, as the theme has them.
  inks: string[]
  // Neither hidden nor covered nor off screen.
  runs: boolean
  // Under reduced motion or pause.
  still: boolean
  // Where the pointer is over the desk.
  pointer: number[] | null
}

const scenes = { passage }
// What every scene takes its chances from.
const SEED = 299
// At most 30 frames a second, and a frame that comes late counts as six ticks at most.
const FRAME = 1000 / 30
const LATE = 6
// The face is measured this many times larger than it is drawn, sign by sign through the printable ones.
const PROBE = 4
const SIGNS = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index))
const MONO = 'wallpaper-mono'
// A canvas draws light text fuller than dark, so the face is measured in white.
const LIGHT = 'white'
const FILE = new URL('../../app/(frontend)/[lang]/jetbrains-mono-latin.woff2', import.meta.url)

let canvas: OffscreenCanvas
let context: OffscreenCanvasRenderingContext2D
let now: Setting | undefined
let grid: Grid
let scene: ReturnType<(typeof scenes)[keyof typeof scenes]> | undefined
let read: ReturnType<typeof ascii> | undefined
let loaded: boolean | undefined
let request = 0
let last: number | undefined
let owed = 0

const font = (size: number) => `400 ${size}px ${MONO}, ui-monospace, monospace`

// How much ink each sign puts in each of the eight parts of its cell, read off the face itself.
function measure(): Face {
  const { pitch } = now!
  const [wide, high] = [pitch * PROBE, pitch * 2 * PROBE]
  const pen = new OffscreenCanvas(wide, high).getContext('2d', { willReadFrequently: true })!
  pen.font = font(Math.round(pitch * SIZE) * PROBE)
  pen.textAlign = 'center'
  pen.textBaseline = 'middle'
  pen.fillStyle = LIGHT
  const most = new Array<number>(8).fill(0)
  const face = SIGNS.map((sign) => {
    const parts = new Array<number>(8).fill(0)
    pen.clearRect(0, 0, wide, high)
    pen.fillText(sign, wide / 2, high / 2)
    const { data } = pen.getImageData(0, 0, wide, high)
    for (let y = 0; y < high; y++)
      for (let x = 0; x < wide; x++)
        parts[Math.floor((y * 4) / high) * 2 + Math.floor((x * 2) / wide)] +=
          data[(y * wide + x) * 4 + 3]
    parts.forEach((ink, n) => {
      parts[n] = ink / (255 * (wide / 2) * (high / 4))
      most[n] = Math.max(most[n], parts[n])
    })
    return { sign, parts }
  })
  for (const { parts } of face) parts.forEach((ink, n) => (parts[n] = ink / (most[n] || 1)))
  return face
}

// The mono face is fetched when signs are first drawn; until it has arrived, the ramp stands in.
function signs() {
  if (loaded === undefined) {
    loaded = false
    const face = new FontFace(MONO, `url(${FILE})`)
    ;(self as unknown as { fonts: FontFaceSet }).fonts.add(face)
    // Without the face the ramp stays.
    face.load().then(
      () => {
        loaded = true
        read = undefined
        draw()
      },
      () => undefined,
    )
  }
  return (read ??= ascii(loaded ? measure() : null))(grid)
}

function draw() {
  const { width, height, pitch, inks, step } = now!
  const ink = (index: number) => inks[step.colour ? index : 0]
  scene!.paint()
  context.clearRect(0, 0, width, height)
  if (step.filter === 'dots') {
    const all = dots(grid)
    for (let index = 0; index < (step.colour ? inks.length : 1); index++) {
      context.fillStyle = inks[index]
      context.beginPath()
      for (const [x, y, radius, named] of all)
        if (!step.colour || named === index) {
          context.moveTo(x + radius, y)
          context.arc(x, y, radius, 0, Math.PI * 2)
        }
      context.fill()
    }
    return
  }
  context.font = font(Math.round(pitch * SIZE))
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (const [sign, x, y, named] of signs()) {
    context.fillStyle = ink(named)
    context.fillText(sign, x, y)
  }
}

const moves = () => !!scene && now!.runs && !now!.still

function frame(at: number) {
  request = 0
  if (!moves()) return
  request = requestAnimationFrame(frame)
  if (last !== undefined && at - last < FRAME - 4) return
  owed += last === undefined ? TICK : Math.min(at - last, TICK * LATE)
  last = at
  for (; owed >= TICK; owed -= TICK) scene!.step(now!.pointer)
  draw()
}

function wake() {
  if (moves() && !request) {
    last = undefined
    owed = 0
    request = requestAnimationFrame(frame)
  }
}

self.onmessage = ({ data }: MessageEvent<Partial<Setting> & { canvas?: OffscreenCanvas }>) => {
  if (data.canvas) {
    canvas = data.canvas
    context = canvas.getContext('2d')!
    return
  }
  const was = now
  now = { ...now!, ...data }
  // A message may arrive before the first whole setting.
  if (!now.step) return
  // Another size of the screen, dot or wallpaper starts the scene afresh; another filter, colour or theme only
  // draws the same moment of it another way.
  const fresh =
    !scene ||
    (['width', 'height', 'ratio', 'pitch'] as const).some((name) => was![name] !== now![name]) ||
    was!.step.wallpaper !== now.step.wallpaper
  if (fresh) {
    canvas.width = now.width * now.ratio
    canvas.height = now.height * now.ratio
    context.setTransform(now.ratio, 0, 0, now.ratio, 0, 0)
    grid = tones(now.width, now.height, now.pitch)
    scene = scenes[now.step.wallpaper](grid, now.width, now.height, seeded(SEED))
    read = undefined
  }
  // The pointer alone changes nothing that is not already being drawn.
  if (fresh || Object.keys(data).some((name) => name !== 'pointer' && name !== 'runs')) draw()
  wake()
}
