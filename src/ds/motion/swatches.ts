import { cubicBezier } from 'motion/react'

import { amount, curve, duration } from './vocabulary'

// The steps a picture resolves through, in pitches: from the coarsest to the dot.
const steps = [4, 2, 1]
// The sweep runs mostly along the picture's lines and a little down it.
const across = 0.6
const down = 1 - across

type Grid = { canvas: HTMLCanvasElement; cols: number; rows: number; cell: number }

// The picture at one size of cell, one pixel for each, laid as the box crops it. Nothing is read back, so a
// picture from another origin resolves the same way.
function sample(img: HTMLImageElement, cell: number): Grid {
  const { clientWidth: width, clientHeight: height, naturalWidth, naturalHeight } = img
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const context = canvas.getContext('2d')!
  // Its natural size counts the chosen density, so it is laid whole as object-fit and object-position lay it.
  const scale = Math.max(width / naturalWidth, height / naturalHeight)
  const [x, y] = getComputedStyle(img)
    .objectPosition.split(' ')
    .map((at) => parseFloat(at) / 100)
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    img,
    ((width - naturalWidth * scale) * x) / cell,
    ((height - naturalHeight * scale) * y) / cell,
    (naturalWidth * scale) / cell,
    (naturalHeight * scale) / cell,
  )
  return { canvas, cols, rows, cell }
}

// Resolves a loaded picture on the canvas over it in round swatches of its own colours, on the pitch, and calls done
// once they have closed up. Returns what stops it.
export function swatches(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  pitch: number,
  done: () => void,
) {
  const grids = steps.map((times) => sample(img, pitch * times))
  const { clientWidth: width, clientHeight: height } = img
  const ratio = Math.min(2, devicePixelRatio || 1)
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const context = canvas.getContext('2d')!

  const ms = (name: Parameters<typeof duration>[0]) => duration(name) * 1000
  const [sweep, step, close, wave, grow] = [
    ms('swatch-sweep'),
    ms('swatch-step'),
    ms('swatch-close'),
    ms('swatch-wave'),
    ms('swatch-grow'),
  ]
  const [fill, from, closed] = [
    amount('swatch-fill'),
    amount('swatch-from'),
    amount('swatch-closed'),
  ]
  const curved = cubicBezier(...curve('swatch'))
  const ease = (share: number) => curved(Math.min(1, Math.max(0, share)))
  // When each step begins, and when the swatches have closed up.
  const starts = [0, sweep, sweep + step]
  const end = sweep + step * 2 + close

  let start: number | undefined
  let request = 0

  function frame(now: number) {
    start ??= now
    const t = Math.min(now - start, end)
    const at = t < starts[1] ? 0 : t < starts[2] ? 1 : 2
    const { canvas: tiny, cols, rows, cell } = grids[at]
    // How far the swatches have squared off, how much of a cell each fills, and how far a finer step has grown.
    const square = ease((t - starts[2] - step) / close)
    const size = fill + (closed - fill) * square
    const grown = at === 0 ? 1 : from + (1 - from) * ease((t - starts[at]) / grow)

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = false
    context.drawImage(tiny, 0, 0, cols * cell, rows * cell)
    // The cells in their colours are cut to the swatches.
    context.globalCompositeOperation = 'destination-in'
    context.beginPath()
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wake =
          at === 0 ? ease((t - ((col / cols) * across + (row / rows) * down) * wave) / grow) : 1
        const side = cell * size * grown * wake
        if (!side) continue
        const x = (col + 0.5) * cell
        const y = (row + 0.5) * cell
        if (square)
          context.roundRect(x - side / 2, y - side / 2, side, side, (side / 2) * (1 - square))
        else {
          context.moveTo(x + side / 2, y)
          context.arc(x, y, side / 2, 0, Math.PI * 2)
        }
      }
    }
    context.fill()
    if (t === end) return done()
    request = requestAnimationFrame(frame)
  }
  request = requestAnimationFrame(frame)

  return () => cancelAnimationFrame(request)
}
