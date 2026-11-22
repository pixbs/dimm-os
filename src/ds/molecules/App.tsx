'use client'

import { Icon, type IconName } from '../atoms/Icon'
import { usePainted } from '../motion/vocabulary'

type TileName = 'raised' | 'paper' | 'orange' | 'blue' | 'mint'

type Props = {
  name: string
  icon: IconName
  // Without an address the app acts where it stands.
  href?: string
  onClick?: () => void
  // The language of its name, where it is not the page's.
  lang?: string
  tile?: TileName
  // Compact drops the name and lives in a bar.
  size?: 'compact'
  selected?: boolean
  // Its window is open: the signal dot.
  open?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'hover' | 'pressed' | 'focus'
}

// An icon on a tile with its name under it; the admin picks icon, name and tile.
export function App({
  name,
  icon,
  href,
  onClick,
  lang,
  tile = 'raised',
  size,
  selected,
  open,
  state,
}: Props) {
  // A dot the server painted is there already; one that comes later pops.
  const painted = usePainted()
  const Root = href ? 'a' : 'button'

  return (
    <Root
      aria-label={size ? name : undefined}
      className="app"
      data-size={size}
      data-state={state}
      href={href}
      lang={lang}
      onClick={onClick}
      type={href ? undefined : 'button'}
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
    </Root>
  )
}

// The compact tile alone, which leads a row of settings and says nothing its title does not.
export function Tile(props: { tile: TileName; icon: IconName }) {
  return (
    <span aria-hidden className="app__tile" data-size="compact" data-surface={props.tile}>
      <Icon name={props.icon} size="s" />
    </span>
  )
}
