// The field that draws the form where the screen sets it.
const HOME = 299

// Every field number gives its own numbers, the same each time.
export const seed = (field: number, k: number) => {
  const x = Math.sin(field * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// The circle, in pixels: where the screen sets it, moved by the field, and as large as its nearest side allows.
export function place(screen: { width: number; height: number; at: number[]; field: number }) {
  const { width, height, at, field } = screen
  const side = Math.min(width, height)
  const shift = (k: number) => (seed(field, k) - seed(HOME, k)) * side * 0.25
  const x = Math.min(Math.max(at[0] * width + shift(3), side / 6), width - side / 6)
  const y = Math.min(Math.max(at[1] * height + shift(4), side / 6), height - side / 6)
  return { x, y, r: Math.min(x, width - x, y, height - y) }
}
