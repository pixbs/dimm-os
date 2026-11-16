// The wallpaper, run by the dot engine in a worker so the page never waits for it.
import { engine, TICK } from '../motion/engine'

// What the page tells it, in CSS pixels: a message may carry any part of it.
export type Setting = {
  width: number
  height: number
  ratio: number
  pitch: number
  // Where the form sits on the screen, as shares of its width and height.
  at: [number, number]
  field: number
  colour: string
  spread: number
  // Neither hidden nor covered nor off screen.
  runs: boolean
  // Under reduced motion or pause.
  still: boolean
  // Where the pointer is over the empty desk.
  lean: [number, number] | null
}

// The grey at which the system's halftone has no dot left, and how far into a cell a full dot reaches.
const NONE = 122 / 255
const REACH = 1.22 / Math.SQRT2
// The field that draws the form where the screen sets it.
const HOME = 299
// At most 30 frames a second.
const FRAME = 1000 / 30

let canvas: OffscreenCanvas
let context: OffscreenCanvasRenderingContext2D
let now: Setting | undefined
let dots: ReturnType<typeof engine> | undefined
let form = { x: 0, y: 0, r: 0 }
// Each particle's home on a form at rest, and how far the form has drifted and leant.
let homes: Float32Array
let time = 0
const lean = { x: 0, y: 0 }
let request = 0
let last: number | undefined
let owed = 0

// Every field number gives its own numbers, the same each time.
const seed = (field: number, k: number) => {
  const x = Math.sin(field * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// The circle, in pixels: where the screen sets it, moved by the field, and as large as its nearest side allows.
function place({ width, height, at, field }: Setting) {
  const side = Math.min(width, height)
  const shift = (k: number) => (seed(field, k) - seed(HOME, k)) * side * 0.25
  const x = Math.min(Math.max(at[0] * width + shift(3), side / 6), width - side / 6)
  const y = Math.min(Math.max(at[1] * height + shift(4), side / 6), height - side / 6)
  return { x, y, r: Math.min(x, width - x, y, height - y) }
}

function draw() {
  dots?.draw(context, now!.colour, 0)
}

function build(from: 'pour' | 'form' | 'home') {
  const { width, height, pitch: step } = now!
  const cols = Math.ceil(width / step)
  const rows = Math.ceil(height / step)
  const old = form
  form = place(now!)
  // The halftone of the system, cell by cell: a full dot in the middle, none at the edge, smaller between.
  const cover = new Uint8Array(cols * rows)
  for (let cell = 0; cell < cover.length; cell++) {
    const far = Math.hypot(
      ((cell % cols) + 0.5) * step - form.x,
      (Math.floor(cell / cols) + 0.5) * step - form.y,
    )
    const tone = Math.max(NONE, 1 - ((1 - NONE) * far) / form.r)
    cover[cell] = Math.min(100, Math.max(0, (1 - 0.5 / tone) * (REACH / 0.43) * 100))
  }
  dots = engine({ step, cols, rows, cover })
  homes = new Float32Array(dots.particles.length * 2)
  dots.particles.forEach((p, index) => {
    homes[index * 2] = p.hx
    homes[index * 2 + 1] = p.hy
    if (from === 'home') return
    // Poured, every dot starts in the middle; formed again, from its place on the form before.
    const [start, share] = from === 'pour' ? [form, 0] : [old, old.r / form.r]
    p.x = (start.x + ((p.hx + 0.5) * step - form.x) * share) / step - 0.5
    p.y = (start.y + ((p.hy + 0.5) * step - form.y) * share) / step - 0.5
  })
  if (from !== 'home') dots.release()
  move()
  if (from === 'home') dots.settle()
}

// The form drifts on a path of its field, slowly enough to look still at a glance, and leans toward the pointer.
function move() {
  const { width, height, pitch, lean: pointer } = now!
  const reach = (Math.min(width, height) * 0.06) / pitch
  const path = (k: number) => {
    const turn = (2 * Math.PI * time) / ((90 + 60 * seed(now!.field, k)) * 1000)
    const start = 2 * Math.PI * seed(now!.field, k + 1)
    return reach * (Math.sin(turn + start) - Math.sin(start))
  }
  const towards = (to: number | undefined, from: number) =>
    to === undefined ? 0 : Math.max(-3, Math.min(3, ((to - from) * 0.1) / pitch))
  lean.x += (towards(pointer?.[0], form.x) - lean.x) * 0.04
  lean.y += (towards(pointer?.[1], form.y) - lean.y) * 0.04
  const x = path(5) + lean.x
  const y = path(7) + lean.y
  dots!.particles.forEach((p, index) => {
    p.hx = homes[index * 2] + x
    p.hy = homes[index * 2 + 1] + y
  })
}

const moves = () => !!dots && now!.runs && !now!.still

function frame(at: number) {
  request = 0
  if (!moves()) return
  request = requestAnimationFrame(frame)
  if (last !== undefined && at - last < FRAME - 4) return
  // A frame that comes late counts as five ticks at most: the form slows down, it does not jump.
  owed += last === undefined ? TICK : Math.min(at - last, TICK * 5)
  last = at
  for (; owed >= TICK; owed -= TICK) {
    time += TICK
    move()
    dots!.tick(now!.spread)
  }
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
  // What was drawn before, if anything was: a message may arrive before the first whole setting.
  const was = dots && now
  now = { ...now!, ...data }
  // A lean alone changes nothing on a form that holds still.
  if (!moves() && Object.keys(data).every((name) => name === 'lean')) return
  const sized = ['width', 'height', 'ratio', 'pitch', 'at'].some(
    (name) =>
      JSON.stringify(was?.[name as keyof Setting]) !== JSON.stringify(now![name as keyof Setting]),
  )
  if (sized) {
    canvas.width = now.width * now.ratio
    canvas.height = now.height * now.ratio
    context.setTransform(now.ratio, 0, 0, now.ratio, 0, 0)
    // It pours in at the start; a screen that changes size or dot is drawn again at rest.
    build(was || now.still ? 'home' : 'pour')
  } else if (was && was.field !== now.field) {
    build(now.still ? 'home' : 'form')
  }
  if (now.still) dots?.settle()
  if (!moves() || sized || data.colour) draw()
  wake()
}
