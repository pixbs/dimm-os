'use client'

import { Icon, type IconName } from '../atoms/Icon'
import { usePainted } from '../motion/vocabulary'

type Props = {
  name: string
  icon: IconName
  href: string
  tile?: 'raised' | 'paper' | 'orange' | 'blue' | 'mint'
  // Compact drops the name and lives in a bar.
  size?: 'compact'
  selected?: boolean
  // Its window is open: the signal dot.
  open?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'hover' | 'pressed' | 'focus'
}

// An icon on a tile with its name under it; the admin picks icon, name and tile.
export function App({ name, icon, href, tile = 'raised', size, selected, open, state }: Props) {
  // A dot the server painted is there already; one that comes later pops.
  const painted = usePainted()

  return (
    <a
      aria-label={size ? name : undefined}
      className="app"
      data-size={size}
      data-state={state}
      href={href}
    >
      <span className="app__tile" data-surface={tile}>
        <Icon name={icon} size={size ? 's' : undefined} />
        {open && (
          <span className="dot app__open" data-pops={painted ? undefined : ''} data-tone="signal" />
        )}
      </span>
      {!size && (
        <span className="app__name" data-surface={selected ? 'inverted' : undefined}>
          {name}
        </span>
      )}
    </a>
  )
}
