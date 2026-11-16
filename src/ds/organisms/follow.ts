import type { PointerEvent } from 'react'

// Follows the pointer from a press to its release, on what was pressed.
export function follow(
  event: PointerEvent<HTMLElement>,
  to: Record<'move' | 'end', (dx: number, dy: number) => void>,
) {
  const held: HTMLElement = event.currentTarget
  const { clientX, clientY } = event
  const released = new AbortController()
  const listen = (type: 'pointermove' | 'pointerup' | 'pointercancel', then: typeof to.move) =>
    held.addEventListener(type, (now) => then(now.clientX - clientX, now.clientY - clientY), {
      signal: released.signal,
    })

  held.setPointerCapture(event.pointerId)
  let last: [number, number] = [0, 0]
  listen('pointermove', (dx, dy) => {
    last = [dx, dy]
    to.move(dx, dy)
  })
  listen('pointerup', (dx, dy) => {
    released.abort()
    to.end(dx, dy)
  })
  // A pointer the browser takes away leaves the window where it last had it, whatever the cancel says.
  listen('pointercancel', () => {
    released.abort()
    to.end(...last)
  })
}
