import type { InputHTMLAttributes } from 'react'

import { Icon } from '../atoms/Icon'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> & {
  kind: 'check' | 'radio' | 'switch'
  // A state shown at rest, for the catalogue.
  state?: 'hover' | 'focus'
}

// A glyph on a real input that covers it, never alone but the lead or trail of a row, or a choice.
export function Toggle({ kind, state, ...input }: Props) {
  return (
    <span className="toggle" data-kind={kind} data-state={state}>
      <input
        {...input}
        role={kind === 'switch' ? 'switch' : undefined}
        type={kind === 'radio' ? 'radio' : 'checkbox'}
      />
      {kind === 'check' && <Icon name="check" size="s" />}
    </span>
  )
}

// One of a few, each a radio and its words; in two columns from a regular window on.
export function Choices(props: {
  name: string
  options: string[]
  value?: string
  columns?: 2
  labelledBy: string
}) {
  return (
    <div
      aria-labelledby={props.labelledBy}
      className="choices"
      data-columns={props.columns}
      role="radiogroup"
    >
      {props.options.map((option) => (
        <label className="choice" key={option}>
          <Toggle
            defaultChecked={option === props.value}
            kind="radio"
            name={props.name}
            value={option}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  )
}
