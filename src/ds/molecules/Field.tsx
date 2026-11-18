import { type ReactNode, useId } from 'react'

import { Icon } from '../atoms/Icon'
import { Upload } from './Upload'

type Props = {
  label: ReactNode
  // One control the field holds; without one, the children are a group the label names.
  kind?: 'text' | 'email' | 'number' | 'date' | 'area' | 'select' | 'upload'
  children?: (labelId: string) => ReactNode
  name?: string
  value?: string
  placeholder?: string
  options?: string[]
  // Upload: what shows before a file is chosen, and the button that chooses one.
  empty?: string
  choose?: string
  help?: ReactNode
  // What is wrong and how to fix it, shown once the value is invalid.
  error?: ReactNode
  invalid?: boolean
  required?: boolean
  locked?: boolean
  disabled?: boolean
  above?: boolean
  ruled?: boolean
  // A control row: a slide or a block of switches under its label, and what it means under that.
  control?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'focus'
}

export function Field(props: Props) {
  const { label, kind, name, value, placeholder, options, help, error, required } = props
  const id = useId()
  // An error is read only while the field is invalid, so it describes the field only when the server says so.
  const described = props.invalid ? error && `${id}-error` : help && `${id}-help`
  const shared = {
    'aria-describedby': described || undefined,
    'aria-errormessage': error ? `${id}-error` : undefined,
    'aria-invalid': props.invalid || undefined,
    className: 'input',
    disabled: props.disabled,
    id,
    name,
    readOnly: props.locked,
    required,
  }
  const Label = kind ? 'label' : 'span'
  const notes = (
    <>
      {help && (
        <span className="row__help" id={`${id}-help`}>
          {help}
        </span>
      )}
      {error && (
        <span className="row__help" data-error="" id={`${id}-error`}>
          {error}
        </span>
      )}
    </>
  )

  return (
    <div
      aria-disabled={props.disabled || undefined}
      className="row"
      data-kind={props.control ? 'control' : 'field'}
      data-layout={props.above ? 'above' : undefined}
      data-locked={props.locked ? '' : undefined}
      data-state={props.state}
    >
      <Label className="row__label" htmlFor={kind ? id : undefined} id={`${id}-label`}>
        {(error || props.invalid) && <span className="dot" data-tone="signal" />}
        <span>
          {label}
          {required && <span aria-hidden="true">{' *'}</span>}
        </span>
      </Label>
      {kind === 'upload' ? (
        <Upload choose={props.choose!} empty={props.empty!} input={shared}>
          {notes}
        </Upload>
      ) : (
        <span className="row__value">
          {(kind === 'text' || kind === 'email' || kind === 'number' || kind === 'date') && (
            <input {...shared} defaultValue={value} placeholder={placeholder} type={kind} />
          )}
          {kind === 'area' && (
            <textarea
              {...shared}
              data-ruled={props.ruled ? '' : undefined}
              defaultValue={value}
              placeholder={placeholder}
            />
          )}
          {kind === 'select' && (
            <select {...shared} defaultValue={value ?? ''}>
              {placeholder !== undefined && (
                <option disabled value="">
                  {placeholder}
                </option>
              )}
              {options?.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          )}
          {props.children?.(`${id}-label`)}
          {notes}
        </span>
      )}
      {(kind === 'date' || kind === 'select' || props.locked) && (
        <span className="row__trail">
          <Icon
            name={props.locked ? 'lock' : kind === 'date' ? 'calendar' : 'chevron-down'}
            size="s"
          />
        </span>
      )}
    </div>
  )
}
