import { duration, still } from './vocabulary'

// A picture in dots, counted in cells of the pitch. A grid keeps a dot in every cell and changes its
// size: cover is the ink of each cell, 0 to 100. Dots strung on lines move themselves: points says
// where each one lives.
export type Picture = { step: number; cols: number; rows: number } & (
  | { cover: ArrayLike<number> }
  | { points: [number, number][] }
)

// The reference counts in frames of a 60 Hz screen: the engine steps on that clock on every screen.
const TICK = 1000 / 60

// Draws the picture on the canvas and lets the pointer stir it: a thick flow carries the dots off, and
// left alone each is pulled home, sweeping from the start to the end. Returns what stops it.
export function pour(canvas: HTMLCanvasElement, picture: Picture) {
  const { step, cols, rows } = picture
  const width = cols * step
  const height = rows * step
  const full = step * 0.43
  const ratio = Math.min(2, devicePixelRatio || 1)
  canvas.width = width * ratio
  canvas.height = height * ratio
  // Drawn at its own size, so its dots stand on the pitch.
  canvas.style.width = `${width}px`
  const context = canvas.getContext('2d')!
  context.scale(ratio, ratio)

  // Each particle remembers its home, carries ink, and waits its turn in the sweep home.
  const spread = duration('spread') * 1000
  const particle = (hx: number, hy: number, ink: number) => ({
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    ink,
    wait: (hx / cols) * spread + Math.random() * 30,
  })
  const particles =
    'points' in picture
      ? picture.points.map(([x, y]) => particle(x, y, 1))
      : Array.from(picture.cover, (cover, cell) =>
          particle(cell % cols, Math.floor(cell / cols), (cover / 100) ** 2),
        ).filter(({ ink }) => ink)

  const area = new Float32Array(cols * rows)
  let fx = new Float32Array(cols * rows)
  let fy = new Float32Array(cols * rows)
  let tx = new Float32Array(cols * rows)
  let ty = new Float32Array(cols * rows)
  // The engine's own time, the moment it was last stirred, and whether anything is away from home.
  let time = 0
  let stirred = 0
  let moving = false
  let seen = false
  let request = 0
  let before: number | undefined
  let owed = 0
  let last: [number, number] | null = null

  // The cell under a point, and how far the point is into it.
  function cellAt(x: number, y: number) {
    const cx = Math.min(Math.max(x, 0), cols - 1.001)
    const cy = Math.min(Math.max(y, 0), rows - 1.001)
    const ax = cx - Math.floor(cx)
    const ay = cy - Math.floor(cy)
    return { cell: Math.floor(cy) * cols + Math.floor(cx), ax, ay }
  }

  function flowAt(field: Float32Array, x: number, y: number) {
    const { cell, ax, ay } = cellAt(x, y)
    return (
      (field[cell] * (1 - ax) + field[cell + 1] * ax) * (1 - ay) +
      (field[cell + cols] * (1 - ax) + field[cell + cols + 1] * ax) * ay
    )
  }

  // The mean of the cells beside a cell: one at an edge has fewer.
  function around(field: Float32Array, col: number, row: number) {
    const cell = row * cols + col
    const l = col > 0 ? 1 : 0
    const r = col < cols - 1 ? 1 : 0
    const u = row > 0 ? 1 : 0
    const d = row < rows - 1 ? 1 : 0
    const sum =
      (l && field[cell - 1]) +
      (r && field[cell + 1]) +
      (u && field[cell - cols]) +
      (d && field[cell + cols])
    return sum / (l + r + u + d)
  }

  function dot(x: number, y: number, radius: number) {
    context.moveTo(x + radius, y)
    context.arc(x, y, radius, 0, Math.PI * 2)
  }

  function draw() {
    const style = getComputedStyle(canvas)
    context.clearRect(0, 0, width, height)
    context.fillStyle = style.color
    context.beginPath()
    if ('points' in picture) {
      const radius = parseFloat(style.strokeWidth) / 2
      for (const { x, y } of particles) dot((x + 0.5) * step, (y + 0.5) * step, radius)
    } else {
      // The ink of every particle is spread onto the four cells around it: the dots stay, their size changes.
      area.fill(0)
      for (const { x, y, ink } of particles) {
        const { cell, ax, ay } = cellAt(x, y)
        area[cell] += ink * (1 - ax) * (1 - ay)
        area[cell + 1] += ink * ax * (1 - ay)
        area[cell + cols] += ink * (1 - ax) * ay
        area[cell + cols + 1] += ink * ax * ay
      }
      for (let cell = 0; cell < area.length; cell++) {
        if (area[cell] < 0.006) continue
        const radius = Math.min(1.15, Math.sqrt(area[cell])) * full
        dot(((cell % cols) + 0.5) * step, (Math.floor(cell / cols) + 0.5) * step, radius)
      }
    }
    context.fill()
  }

  // One tick of the clock. Says whether anything still moves.
  function tick() {
    time += TICK
    // A thick flow: every cell takes on its neighbours, and all of it dies down.
    let flow = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = row * cols + col
        tx[cell] = (fx[cell] * 0.55 + around(fx, col, row) * 0.45) * 0.955
        ty[cell] = (fy[cell] * 0.55 + around(fy, col, row) * 0.45) * 0.955
        flow += Math.abs(tx[cell]) + Math.abs(ty[cell])
      }
    }
    ;[fx, tx, fy, ty] = [tx, fx, ty, fy]

    const idle = time - stirred
    let away = 0
    for (const p of particles) {
      // The flow drags the particle, and its own speed carries it on.
      const homing = idle - 380 - p.wait
      const drag = homing > 0 ? 0.12 : 0.35
      p.vx += (flowAt(fx, p.x, p.y) - p.vx) * drag
      p.vy += (flowAt(fy, p.x, p.y) - p.vy) * drag
      // Left alone, a spring that grows stronger pulls it home.
      if (homing > 0) {
        const pull = Math.min(0.03, 0.004 + (homing / 900) * 0.026)
        p.vx = (p.vx + (p.hx - p.x) * pull) * 0.85
        p.vy = (p.vy + (p.hy - p.y) * pull) * 0.85
      }
      const speed = Math.hypot(p.vx, p.vy)
      if (speed > 1.2) {
        p.vx *= 1.2 / speed
        p.vy *= 1.2 / speed
      }
      p.x += p.vx
      p.y += p.vy
      // The edge of the picture throws it back, slower.
      if (p.x < 0 || p.x > cols - 1) {
        p.x = Math.min(Math.max(p.x, 0), cols - 1)
        p.vx *= -0.3
      }
      if (p.y < 0 || p.y > rows - 1) {
        p.y = Math.min(Math.max(p.y, 0), rows - 1)
        p.vy *= -0.3
      }
      let far = Math.abs(p.x - p.hx) + Math.abs(p.y - p.hy)
      if (homing > 0 && far < 0.015 && speed < 0.01) {
        Object.assign(p, { x: p.hx, y: p.hy, vx: 0, vy: 0 })
        far = 0
      }
      away += far
    }
    return away > 0 || flow >= 0.02 || idle <= 600
  }

  function settle() {
    for (const p of particles) Object.assign(p, { x: p.hx, y: p.hy, vx: 0, vy: 0 })
    fx.fill(0)
    fy.fill(0)
    moving = false
  }

  function frame(now: number) {
    // A frame that comes late counts as five ticks at most: the picture slows down, it does not jump.
    owed += before === undefined ? TICK : Math.min(now - before, TICK * 5)
    before = now
    for (; owed >= TICK && moving; owed -= TICK) moving = tick()
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

  function stir() {
    stirred = time
    moving = true
    wake()
  }

  // The pointer in the picture's own space, so a picture that is turned still knows where it is.
  const local = (event: PointerEvent): [number, number] => [
    (event.offsetX * width) / canvas.clientWidth / step - 0.5,
    (event.offsetY * height) / canvas.clientHeight / step - 0.5,
  ]

  // Every cell within reach of the point, with how far from it the cell is.
  function reach(x: number, y: number, radius: number, push: (cell: number, far: number) => void) {
    for (
      let row = Math.max(0, Math.floor(y - radius));
      row <= Math.min(rows - 1, y + radius);
      row++
    ) {
      for (
        let col = Math.max(0, Math.floor(x - radius));
        col <= Math.min(cols - 1, x + radius);
        col++
      ) {
        const far = Math.hypot(col - x, row - y)
        if (far < radius) push(row * cols + col, far)
      }
    }
  }

  // A pointer that moves drags the flow along with it.
  function onMove(event: PointerEvent) {
    const [x, y] = local(event)
    const dx = last ? x - last[0] : 0
    const dy = last ? y - last[1] : 0
    const speed = Math.hypot(dx, dy)
    last = [x, y]
    if (speed <= 0.05 || still()) return
    const cap = Math.min(1, 3 / speed)
    reach(x, y, 4.6, (cell, far) => {
      const force = (1.1 * (1 - far / 4.6)) ** 2
      fx[cell] += dx * cap * force
      fy[cell] += dy * cap * force
    })
    stir()
  }

  // A press splashes outward from the finger.
  function onDown(event: PointerEvent) {
    const [x, y] = (last = local(event))
    if (still()) return
    reach(x, y, 5.5, (cell, far) => {
      if (!far) return
      const force = ((1 - far / 5.5) * 1.5) / far
      fx[cell] += ((cell % cols) - x) * force
      fy[cell] += (Math.floor(cell / cols) - y) * force
    })
    stir()
  }

  const onLeave = () => (last = null)

  const watcher = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting
    wake()
  })
  // The settings and the theme are attributes of the root; what covers a part makes it inert.
  const settings = new MutationObserver(wake)

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
