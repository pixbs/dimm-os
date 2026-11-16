// The dot engine itself. It touches no page, so a picture on the page and the wallpaper in a worker run the same one.

// A picture in cells of the pitch: a grid gives the ink of each cell from 0 to 100, dots on lines where each dot lives.
export type Picture = { step: number; cols: number; rows: number } & (
  | { cover: ArrayLike<number> }
  | { points: [number, number][] }
)

// The reference counts in frames of a 60 Hz screen: the engine steps on that clock on every screen.
export const TICK = 1000 / 60

export function engine(picture: Picture) {
  const { step, cols, rows } = picture
  const width = cols * step
  const height = rows * step
  const full = step * 0.43

  // Each particle remembers its home, carries ink, and has its place in the sweep home.
  const particle = (hx: number, hy: number, ink: number) => ({
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    ink,
    order: hx / cols,
    jitter: Math.random() * 30,
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
  // The engine's own time, the moment it was last stirred, and whether the flow has died down.
  let time = 0
  let stirred = 0
  let flowing = false

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

  return {
    particles,
    width,
    height,

    // A pointer that moves drags the flow along with it, by its move in cells.
    stir(x: number, y: number, dx: number, dy: number) {
      const cap = Math.min(1, 3 / Math.hypot(dx, dy))
      reach(x, y, 4.6, (cell, far) => {
        const force = (1.1 * (1 - far / 4.6)) ** 2
        fx[cell] += dx * cap * force
        fy[cell] += dy * cap * force
      })
      stirred = time
      flowing = true
    },

    // A press splashes outward from the finger.
    splash(x: number, y: number) {
      reach(x, y, 5.5, (cell, far) => {
        if (!far) return
        const force = ((1 - far / 5.5) * 1.5) / far
        fx[cell] += ((cell % cols) - x) * force
        fy[cell] += (Math.floor(cell / cols) - y) * force
      })
      stirred = time
      flowing = true
    },

    // Particles set away from home start back at once, sweeping from the start to the end.
    release() {
      stirred = time - 380
    },

    // One tick of the clock, which says whether anything still moves; the spread is in ms.
    tick(spread: number) {
      time += TICK
      // A thick flow: every cell takes on its neighbours, and all of it dies down.
      let flow = 0
      if (flowing) {
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const cell = row * cols + col
            tx[cell] = (fx[cell] * 0.55 + around(fx, col, row) * 0.45) * 0.955
            ty[cell] = (fy[cell] * 0.55 + around(fy, col, row) * 0.45) * 0.955
            flow += Math.abs(tx[cell]) + Math.abs(ty[cell])
          }
        }
        ;[fx, tx, fy, ty] = [tx, fx, ty, fy]
        // A flow that has died down is left still, so a picture at rest costs nothing.
        if (flow < 0.02) {
          fx.fill(0)
          fy.fill(0)
          flowing = false
        }
      }

      const idle = time - stirred
      let away = 0
      for (const p of particles) {
        // The flow drags the particle, and its own speed carries it on.
        const homing = idle - 380 - p.order * spread - p.jitter
        const drag = homing > 0 ? 0.12 : 0.35
        p.vx += ((flowing ? flowAt(fx, p.x, p.y) : 0) - p.vx) * drag
        p.vy += ((flowing ? flowAt(fy, p.x, p.y) : 0) - p.vy) * drag
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
      return away > 0 || flowing || idle <= 600
    },

    settle() {
      for (const p of particles) Object.assign(p, { x: p.hx, y: p.hy, vx: 0, vy: 0 })
      fx.fill(0)
      fy.fill(0)
      flowing = false
    },

    // In the colour given; a dot strung on a line has the radius given.
    draw(
      context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
      colour: string,
      radius: number,
    ) {
      const dot = (x: number, y: number, size: number) => {
        context.moveTo(x + size, y)
        context.arc(x, y, size, 0, Math.PI * 2)
      }
      context.clearRect(0, 0, width, height)
      context.fillStyle = colour
      context.beginPath()
      if ('points' in picture) {
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
          const size = Math.min(1.15, Math.sqrt(area[cell])) * full
          dot(((cell % cols) + 0.5) * step, (Math.floor(cell / cols) + 0.5) * step, size)
        }
      }
      context.fill()
    },
  }
}
