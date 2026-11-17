import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

import type { Named } from '@/i18n/keys'

import { Icon, type IconName } from '../atoms/Icon'
import { ForDevice } from './Key'
import { Tip } from './Tooltip'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  // Without a label the button is its icon, and its name shows as a tooltip.
  label?: string
  name?: string
  icon?: IconName
  // A dot, a mark or a tag before the label.
  lead?: ReactNode
  end?: IconName
  hint?: Named
  // Without a label, the key stands beside the icon instead of in its tooltip.
  keyed?: boolean
  // What counts in the end slot while it works; until then it cannot be pressed again.
  busy?: ReactNode
  tone?: 'solid' | 'outline'
  // Chrome is compact where a fine pointer uses it and regular where a finger can land.
  size?: 'compact' | 'chrome'
  fill?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'hover' | 'pressed' | 'focus'
}

export function Button(props: Props) {
  const { label, name, icon, lead, end, hint, keyed, busy, tone, size, fill, state, ...rest } =
    props
  const key = hint && (label || keyed) && (
    <span className="btn__key">
      <ForDevice text={hint} />
    </span>
  )
  const trail = busy || (end ? <Icon name={end} size="s" /> : label && key)

  return (
    <button
      type="button"
      {...rest}
      aria-busy={busy ? true : undefined}
      aria-label={label ? undefined : name}
      className="btn"
      data-icon={label || keyed ? undefined : ''}
      data-size={size}
      data-state={state}
      data-surface={tone === 'solid' ? 'inverted' : undefined}
      data-tone={tone}
      data-width={fill ? 'fill' : undefined}
      onClick={busy ? undefined : rest.onClick}
    >
      {icon && <Icon name={icon} size={label || size === 'compact' ? 's' : size} />}
      {lead}
      {label ? <span className="btn__label">{label}</span> : key}
      {trail && <span className="btn__end">{trail}</span>}
      {!label && name && <Tip hint={keyed ? undefined : hint} label={name} />}
    </button>
  )
}

// A button that goes to a window is a plain link, so it works without script. Without an address it keeps its
// label and goes nowhere, as a button to a window this visitor may not see.
export function ButtonLink({
  label,
  name,
  icon,
  lead,
  end,
  tone,
  size,
  fill,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> &
  Pick<Props, 'label' | 'name' | 'icon' | 'lead' | 'end' | 'size' | 'tone' | 'fill'>) {
  return (
    <a
      aria-disabled={rest.href ? undefined : true}
      aria-label={label ? undefined : name}
      role={rest.href ? undefined : 'link'}
      {...rest}
      className="btn"
      data-icon={label ? undefined : ''}
      data-size={size}
      data-surface={tone === 'solid' ? 'inverted' : undefined}
      data-tone={tone}
      data-width={fill ? 'fill' : undefined}
    >
      {icon && <Icon name={icon} size={label || size === 'compact' ? 's' : size} />}
      {lead}
      {label && <span className="btn__label">{label}</span>}
      {end && (
        <span className="btn__end">
          <Icon name={end} size="s" />
        </span>
      )}
      {!label && name && <Tip label={name} />}
    </a>
  )
}

// Buttons that share their edges: a choice hugs its cells, actions fill the width and stack in a compact window,
// and cells, one for each thing they stand for, stay side by side at every width.
export function ButtonGroup(props: {
  hug?: boolean
  cells?: boolean
  label?: string
  children: ReactNode
}) {
  return (
    <div
      aria-label={props.label}
      className="btngroup"
      data-cells={props.cells ? '' : undefined}
      data-width={props.hug ? 'hug' : undefined}
      role="group"
    >
      {props.children}
    </div>
  )
}
