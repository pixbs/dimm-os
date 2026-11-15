'use client'

import { type InputHTMLAttributes, type ReactNode, useState } from 'react'

type Props = {
  choose: string
  empty: string
  input: InputHTMLAttributes<HTMLInputElement>
  children: ReactNode
}

// The value and the trail of an upload field: what was chosen, and the button that chooses it.
export function Upload({ choose, empty, input, children }: Props) {
  const [chosen, setChosen] = useState('')
  const status = `${input.id}-files`

  return (
    <>
      <span className="row__value">
        <span className="input" data-empty={chosen ? undefined : ''} id={status}>
          {chosen || empty}
        </span>
        {children}
      </span>
      <span className="row__trail">
        <label className="btn" data-size="compact" data-tone="outline">
          <input
            {...input}
            aria-describedby={[status, input['aria-describedby']].filter(Boolean).join(' ')}
            className={`${input.className} upload`}
            onChange={(event) =>
              setChosen([...(event.target.files ?? [])].map((file) => file.name).join(', '))
            }
            type="file"
          />
          <span className="btn__label">{choose}</span>
        </label>
      </span>
    </>
  )
}
