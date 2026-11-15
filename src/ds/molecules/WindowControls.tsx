import type { Dictionary } from '@/i18n/en'

import { Button } from './Button'

type Control = 'close' | 'minimise' | 'fullScreen'

// The sign each dot shows, on a grid of 16, and the icon of each square.
const signs = {
  close: 'M3.5 3.5l9 9M12.5 3.5l-9 9',
  minimise: 'M3 8h10',
  fullScreen: 'M3 8h10M8 3v10',
}
const icons = { close: 'close', minimise: 'minus', fullScreen: 'expand' } as const

type Props = {
  shape: 'dots' | 'squares'
  // compact under a pointer, regular where a finger lands
  size: 'compact' | 'regular'
  // What the window does not allow stays in its place, disabled.
  off?: Control[]
  t: Pick<Dictionary, Control | 'window'>
}

// Close, minimise, full screen: as dots in that order at the start of a bar, as squares at its end with close last.
export function WindowControls({ shape, size, off = [], t }: Props) {
  const order: Control[] =
    shape === 'dots' ? ['close', 'minimise', 'fullScreen'] : ['minimise', 'fullScreen', 'close']

  return (
    <span aria-label={t.window} className="wctl" data-shape={shape} data-size={size} role="group">
      {order.map((control) =>
        shape === 'dots' ? (
          <button
            aria-label={t[control]}
            className="wdot"
            data-close={control === 'close' ? '' : undefined}
            disabled={off.includes(control)}
            key={control}
            type="button"
          >
            <span className="wdot__dot">
              <svg aria-hidden className="wdot__sign" viewBox="0 0 16 16">
                <path d={signs[control]} />
              </svg>
            </span>
          </button>
        ) : (
          <Button
            disabled={off.includes(control)}
            icon={icons[control]}
            key={control}
            name={t[control]}
            size={size === 'compact' ? size : undefined}
          />
        ),
      )}
    </span>
  )
}
