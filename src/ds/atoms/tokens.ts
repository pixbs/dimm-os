import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// What the stylesheet declares at the root, read where no stylesheet is: a picture drawn on the server. It is read at
// the first drawing, so a server without the file fails that drawing alone.
let declared: Map<string, string> | undefined
function read() {
  const sheet = readFileSync(join(process.cwd(), 'src/ds/atoms/tokens.css'), 'utf8')
  const found = new Map<string, string>()
  for (const [, selector, body] of sheet
    .replace(/\/\*[^]*?\*\//g, '')
    .matchAll(/([^{}]+)\{([^{}]*)\}/g))
    if (selector.split(',').some((one) => one.trim() === ':root'))
      for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g))
        found.set(name, value.replace(/\s+/g, ' ').trim())
  return found
}
const raw = (name: string) => (declared ??= read()).get(name) ?? ''

// Every call of a CSS function in a value, innermost first, replaced by what it comes to.
function calls(value: string, name: string, to: (...parts: string[]) => string): string {
  const at = value.lastIndexOf(`${name}(`)
  if (at < 0) return value
  let depth = 0
  let end = at + name.length
  const parts = ['']
  for (; end < value.length; end++) {
    const sign = value[end]
    if (sign === '(' && depth++ === 0) continue
    if (sign === ')' && --depth === 0) break
    if (sign === ',' && depth === 1) parts.push('')
    else parts[parts.length - 1] += sign
  }
  const made = to(...parts.map((part) => part.trim()))
  return calls(value.slice(0, at) + made + value.slice(end + 1), name, to)
}

// A colour of the tokens at a strength, as a canvas without color-mix takes it.
const mixed = (mix: string) => {
  const [, hex, strength] = mix.match(/#([\da-f]{6}) ([\d.]+)%/i) ?? []
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${Number(strength) / 100})`
}

// A token in the dark theme, as a canvas without light-dark and color-mix takes it.
const resolved = (name: string): string => {
  let css = calls(raw(name), 'var', (inner) => resolved(inner) || inner)
  css = calls(css, 'light-dark', (_light, dark) => dark)
  return calls(css, 'color-mix', (_space, mix) => mixed(mix))
}

// The tokens with every length times a scale: a value as CSS writes it, a length as a number, the foreground of a
// surface at a strength, and a type style.
export function tokens(scale: number) {
  const value = (name: string) =>
    resolved(name).replace(/([\d.]+)px/g, (_, length) => `${Number(length) * scale}px`)
  const px = (name: string) => parseFloat(value(name))
  return {
    value,
    px,
    at: (colour: string, strength: string) => mixed(`${value(colour)} ${value(strength)}`),
    type(name: string, tracking?: string) {
      const [, weight, size, line] = value(name).match(/^(\d+) ([\d.]+)px \/ ([\d.]+)px/) ?? []
      return {
        fontFamily: raw(name).includes('--font-mono') ? 'mono' : 'sans',
        fontWeight: Number(weight),
        fontSize: Number(size),
        lineHeight: `${line}px`,
        letterSpacing: tracking ? parseFloat(value(tracking)) * Number(size) : 0,
      }
    },
  }
}
