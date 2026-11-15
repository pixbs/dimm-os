import type { ReactNode } from 'react'

import { Icon, type IconName } from '../atoms/Icon'

type Lines = ReactNode | ReactNode[]

type Props = {
  // Lead: an index, an icon, a picture (null for an empty one), or a dot or toggle given as it is.
  index?: string
  icon?: IconName
  media?: ReactNode
  lead?: ReactNode
  // What identifies the item, in a third of the row beside what it says.
  side?: { index?: string; title: ReactNode; text?: Lines }
  title?: ReactNode
  text?: Lines
  label?: ReactNode
  value?: ReactNode
  above?: boolean
  meta?: ReactNode
  trail?: ReactNode
  end?: IconName
  scale?: 'heading'
  size?: 'compact'
  // A link; without one, a row that is pressed, current, opens or can be disabled is a button.
  href?: string
  // A row that holds a toggle is its label, so pressing anywhere on it presses the toggle.
  toggles?: boolean
  expanded?: boolean
  pressed?: boolean
  current?: boolean
  disabled?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'hover' | 'pressed' | 'focus'
}

const lines = (text: Lines) =>
  [text].flat().map((line, index) => (
    <span className="row__text" key={index}>
      {line}
    </span>
  ))

export function Row(props: Props) {
  const { index, icon, media, lead, side, title, text, label, value, meta, trail, end } = props
  const { href, expanded, pressed, current, disabled } = props
  const button = !href && [expanded, pressed, current, disabled].some((set) => set !== undefined)
  const Element = href ? 'a' : button ? 'button' : props.toggles ? 'label' : 'div'
  // Opening in place shows the text and turns the plus to a minus.
  const sign = expanded === undefined ? end : expanded ? 'minus' : 'plus'

  return (
    <Element
      aria-current={current ? (href ? 'page' : 'true') : undefined}
      aria-expanded={expanded}
      aria-pressed={pressed}
      className="row"
      data-layout={props.above ? 'above' : side ? 'split' : undefined}
      data-scale={props.scale}
      data-size={props.size}
      data-state={props.state}
      data-surface={pressed ? 'inverted' : undefined}
      disabled={button ? disabled : undefined}
      href={href}
      type={button ? 'button' : undefined}
    >
      {media !== undefined && <span className="row__media">{media}</span>}
      {(index || icon || lead) && (
        <span className="row__lead">
          {index && <span className="row__index">{index}</span>}
          {icon && <Icon name={icon} size={props.size ? 's' : undefined} />}
          {lead}
        </span>
      )}
      {side && (
        <span className="row__side">
          {side.index && <span className="row__index">{side.index}</span>}
          <span className="row__title">{side.title}</span>
          {side.text && lines(side.text)}
        </span>
      )}
      {label !== undefined ? (
        <>
          <span className="row__label">{label}</span>
          <span className="row__value">{value}</span>
        </>
      ) : (
        <span className="row__main">
          <span className="row__title">{title}</span>
          {text && expanded !== false && lines(text)}
        </span>
      )}
      {meta && <span className="row__meta">{meta}</span>}
      {(trail || sign) && (
        <span className="row__trail">
          {trail}
          {sign && <Icon name={sign} size="s" />}
        </span>
      )}
    </Element>
  )
}
