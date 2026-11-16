'use client'

import { change } from '@/ds/atoms/settings'

// The settings a visitor will later find in Preferences and Accessibility, by the names of their attributes.
const choices = {
  theme: ['dark', 'light'],
  contrast: ['standard', 'more'],
  pitch: ['5', '6', '8', '10', '12'],
  hand: ['dots', 'squares'],
  spacing: ['standard', 'wide'],
  motion: ['full', 'reduce'],
  pause: ['off', 'on'],
  single: ['off', 'on'],
}

export function Settings({ reset }: { reset: string }) {
  return (
    <div className="doc__sets">
      {Object.entries(choices).map(([name, values]) => (
        <span key={name}>
          {name}
          {values.map((value) => (
            <button key={value} onClick={() => change({ [name]: value })} type="button">
              {value}
            </button>
          ))}
        </span>
      ))}
      <button
        onClick={() => change(Object.fromEntries(Object.keys(choices).map((name) => [name, null])))}
        type="button"
      >
        {reset}
      </button>
    </div>
  )
}
