'use client'

import { change } from '@/ds/atoms/settings'

// The settings a visitor will later find in Preferences and Accessibility, by the names of their attributes.
const choices = {
  theme: ['dark', 'light'],
  contrast: ['standard', 'more'],
  pitch: ['5', '6', '8', '10', '12'],
  spacing: ['standard', 'wide'],
}

export function Settings({ reset }: { reset: string }) {
  return (
    <>
      {Object.entries(choices).map(([name, values]) => (
        <span className="doc__set" key={name}>
          {name}
          {values.map((value) => (
            <button key={value} onClick={() => change(name, value)} type="button">
              {value}
            </button>
          ))}
        </span>
      ))}
      <button
        onClick={() => Object.keys(choices).forEach((name) => change(name, null))}
        type="button"
      >
        {reset}
      </button>
    </>
  )
}
