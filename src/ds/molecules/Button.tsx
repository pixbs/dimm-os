import type { ButtonHTMLAttributes, ReactNode } from 'react'

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
  // What counts in the end slot while it works; until then it cannot be pressed again.
  busy?: ReactNode
  tone?: 'solid' | 'outline'
  size?: 'compact'
  fill?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'hover' | 'pressed' | 'focus'
}

export function Button(props: Props) {
  const { label, name, icon, lead, end, hint, busy, tone, size, fill, state, ...rest } = props
  const key = hint && label && (
    <span className="btn__key">
      <ForDevice text={hint} />
    </span>
  )
  const trail = busy ?? (end ? <Icon name={end} size="s" /> : key)

  return (
    <button
      type="button"
      {...rest}
      aria-busy={busy ? true : undefined}
      aria-label={label ? undefined : name}
      className="btn"
      data-icon={label ? undefined : ''}
      data-size={size}
      data-state={state}
      data-surface={tone === 'solid' ? 'inverted' : undefined}
      data-tone={tone}
      data-width={fill ? 'fill' : undefined}
      onClick={busy ? undefined : rest.onClick}
    >
      {icon && <Icon name={icon} size={label || size ? 's' : undefined} />}
      {lead}
      {label && <span className="btn__label">{label}</span>}
      {trail && <span className="btn__end">{trail}</span>}
      {!label && name && <Tip hint={hint} label={name} />}
    </button>
  )
}

// Buttons that share their edges: a choice hugs its cells, actions fill the width and stack in a compact window.
export function ButtonGroup(props: { hug?: boolean; label?: string; children: ReactNode }) {
  return (
    <div
      aria-label={props.label}
      className="btngroup"
      data-width={props.hug ? 'hug' : undefined}
      role="group"
    >
      {props.children}
    </div>
  )
}
