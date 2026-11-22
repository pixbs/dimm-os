import type { HTMLAttributes, ReactNode } from 'react'

import { Icon, type IconName } from '../atoms/Icon'

type Lines = ReactNode | ReactNode[]

type Props = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
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
  // A link; without one, a row that acts, is pressed, current, opens or can be disabled is a button.
  href?: string
  hrefLang?: string
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
  // What is not a slot or a state is the element's own.
  const {
    index,
    icon,
    media,
    lead,
    side,
    title,
    text,
    label,
    value,
    above,
    meta,
    trail,
    end,
    ...own
  } = props
  const { scale, size, href, toggles, expanded, pressed, current, disabled, state, ...rest } = own
  // A link that cannot be followed is a disabled button, and a row that acts or holds a state is a button.
  const link = !!href && !disabled
  const button =
    !link &&
    (!!rest.onClick || [expanded, pressed, current, disabled].some((set) => set !== undefined))
  const Element = link ? 'a' : button ? 'button' : toggles ? 'label' : 'div'
  // Opening in place shows the text and turns the plus to a minus.
  const sign = expanded === undefined ? end : expanded ? 'minus' : 'plus'

  return (
    <Element
      aria-current={current ? (link ? 'page' : 'true') : undefined}
      aria-expanded={expanded}
      aria-pressed={button ? pressed : undefined}
      className="row"
      data-layout={above ? 'above' : side ? 'split' : undefined}
      data-scale={scale}
      data-size={size}
      data-state={state}
      data-surface={pressed ? 'inverted' : undefined}
      disabled={button ? disabled : undefined}
      href={link ? href : undefined}
      type={button ? 'button' : undefined}
      {...rest}
    >
      {media !== undefined && <span className="row__media">{media}</span>}
      {(index || icon || lead) && (
        <span className="row__lead">
          {index && <span className="row__index">{index}</span>}
          {icon && <Icon name={icon} size={size ? 's' : undefined} />}
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
