import { engine, type Picture, TICK } from './engine'
import { duration, still } from './vocabulary'

export type { Picture } from './engine'

// Draws the picture and lets the pointer stir it until left alone, and returns what stops it.
export function pour(canvas: HTMLCanvasElement, picture: Picture) {
  const { step } = picture
  const dots = engine(picture)
  const { width, height } = dots
  const ratio = Math.min(2, devicePixelRatio || 1)
  canvas.width = width * ratio
  canvas.height = height * ratio
  // Drawn at its own size, so its dots stand on the pitch.
  canvas.style.width = `${width}px`
  const context = canvas.getContext('2d')!
  context.scale(ratio, ratio)

  // Whether anything is away from home, and whether it is on screen.
  let moving = false
  let seen = false
  let request = 0
  let before: number | undefined
  let owed = 0
  let last: [number, number] | null = null
  // Read again whenever a setting changes, since reduced motion sets it to nothing.
  let spread = duration('spread') * 1000

  function draw() {
    const style = getComputedStyle(canvas)
    dots.draw(context, style.color, parseFloat(style.strokeWidth) / 2)
  }

  function settle() {
    dots.settle()
    moving = false
  }

  function frame(now: number) {
    // A frame that comes late counts as five ticks at most: the picture slows down, it does not jump.
    owed += before === undefined ? TICK : Math.min(now - before, TICK * 5)
    before = now
    for (; owed >= TICK && moving; owed -= TICK) moving = dots.tick(spread)
    if (!moving) settle()
    draw()
    request = moving ? requestAnimationFrame(frame) : 0
  }

  // Nothing runs while the tab is hidden, the picture is off screen or in a part that is covered, or
  // under either setting: then it is drawn at rest.
  function wake() {
    if (still()) settle()
    const runs = moving && seen && !document.hidden && !canvas.closest('[inert]')
    if (runs && !request) {
      before = undefined
      owed = 0
      request = requestAnimationFrame(frame)
    }
    if (!runs) {
      cancelAnimationFrame(request)
      request = 0
      draw()
    }
  }

  function stirred() {
    moving = true
    wake()
  }

  // The pointer in the picture's own space, so a picture that is turned still knows where it is.
  const local = (event: PointerEvent): [number, number] => [
    (event.offsetX * width) / canvas.clientWidth / step - 0.5,
    (event.offsetY * height) / canvas.clientHeight / step - 0.5,
  ]

  function onMove(event: PointerEvent) {
    const [x, y] = local(event)
    const dx = last ? x - last[0] : 0
    const dy = last ? y - last[1] : 0
    last = [x, y]
    if (Math.hypot(dx, dy) <= 0.05 || still()) return
    dots.stir(x, y, dx, dy)
    stirred()
  }

  function onDown(event: PointerEvent) {
    const [x, y] = (last = local(event))
    if (still()) return
    dots.splash(x, y)
    stirred()
  }

  const onLeave = () => (last = null)

  const watcher = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting
    wake()
  })
  // The settings and the theme are attributes of the root; what covers a part makes it inert.
  const settings = new MutationObserver(() => {
    spread = duration('spread') * 1000
    wake()
  })

  draw()
  watcher.observe(canvas)
  settings.observe(document.documentElement, { attributes: true })
  settings.observe(document.body, { attributeFilter: ['inert'], subtree: true })
  document.addEventListener('visibilitychange', wake)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerleave', onLeave)

  return () => {
    cancelAnimationFrame(request)
    watcher.disconnect()
    settings.disconnect()
    document.removeEventListener('visibilitychange', wake)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerleave', onLeave)
  }
}
