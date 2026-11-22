// A fish seen from above: its body lies along the way its head has come, so it follows in a curve.
import { type Grid, limb } from './tones'

const far = (a: number[], b: number[]) => Math.hypot(b[0] - a[0], b[1] - a[1])

// The shortest turn from one way to another, in radians.
export function between(from: number, to: number) {
  const turn = (to - from) % (Math.PI * 2)
  return turn > Math.PI ? turn - Math.PI * 2 : turn < -Math.PI ? turn + Math.PI * 2 : turn
}

// The head moves on, and the way keeps only as much as the body is long.
export function follow(way: number[][], head: number[], length: number) {
  way.unshift(head)
  let along = 0
  for (let n = 1; n < way.length; n++) {
    along += far(way[n - 1], way[n])
    if (along >= length) {
      way.length = n + 1
      return
    }
  }
}

// Points at equal steps along the way from the head to the end of the body, each with the way it faces.
export function spine(way: number[][], count: number, length: number) {
  const points: number[][] = []
  let start = 0
  let n = 0
  for (let k = 0; k < count; k++) {
    const want = (length * k) / (count - 1)
    while (n < way.length - 2 && start + far(way[n], way[n + 1]) < want) {
      start += far(way[n], way[n + 1])
      n++
    }
    const [a, b] = [way[n], way[n + 1] ?? way[n]]
    const t = Math.min(1, (want - start) / (far(a, b) || 1))
    points.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      Math.atan2(a[1] - b[1], a[0] - b[0]),
    ])
  }
  return points
}

// A fin or a barbel from a point, at an angle against the way the body faces there, tapering to its tip.
export function fin(
  grid: Grid,
  [x, y, facing]: number[],
  angle: number,
  long: number,
  [root, tip]: number[],
  shade: number,
  ink: number,
) {
  const end = [x + Math.cos(facing + angle) * long, y + Math.sin(facing + angle) * long]
  limb(grid, [x, y], end, root, tip, shade, ink)
}
