'use client'

import type { Transition } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useState } from 'react'

import { Decipher } from '../motion/Decipher'
import { Liquid } from '../motion/Liquid'
import type { Picture } from '../motion/liquid'
import { Origin } from '../motion/Origin'
import { reduced, spring } from '../motion/vocabulary'
import { Cap, u } from './parts'

// What it holds plays when its button is pressed, and plays back when it is pressed again.
export function Played({ label, children }: { label: string; children: ReactNode }) {
  const [on, setOn] = useState(false)

  return (
    <div className="played" data-on={on ? '' : undefined}>
      <button aria-pressed={on} className="play" onClick={() => setOn(!on)} type="button">
        {label}
      </button>
      {children}
    </div>
  )
}

// A dot Motion carries across its track on a spring: pressed again in flight, it turns round where it is.
export function Springs({ label }: { label: string }) {
  const [on, setOn] = useState(false)
  const [move, setMove] = useState<{ x: string; transition?: Transition }>({ x: '0%' })

  function press() {
    // With reduced motion the dot does not travel, even back from across, and the track fades it out here and in there.
    setMove({
      x: on || reduced() ? '0%' : '100%',
      transition: reduced() ? { duration: 0 } : spring('slow'),
    })
    setOn(!on)
  }

  return (
    <div className="played" data-on={on ? '' : undefined}>
      <button aria-pressed={on} className="play" onClick={press} type="button">
        {label}
      </button>
      <div className="run">
        <m.span animate={move} initial={false}>
          <i className="dot" />
        </m.span>
        <span>
          <i className="dot" />
        </span>
      </div>
    </div>
  )
}

const ways = [
  { speed: 'fast', opener: true },
  { speed: 'slow', opener: true },
  { speed: 'slow', opener: false },
] as const

export function Opens({ caps, text }: { caps: string[]; text: string }) {
  const [open, setOpen] = useState(false)
  const [way, setWay] = useState<{ speed: 'fast' | 'slow'; opener: Element | null }>({
    speed: 'slow',
    opener: null,
  })

  return (
    <div className="stage opens" data-surface="desktop">
      <div className="played">
        {ways.map(({ speed, opener }, index) => (
          <button
            aria-pressed={open && way.speed === speed && !way.opener === !opener}
            className="play"
            key={index}
            onClick={(event) => {
              // Whichever button closes the part, it goes back the way it came.
              if (!open) setWay({ speed, opener: opener ? event.currentTarget : null })
              setOpen(!open)
            }}
            type="button"
          >
            {caps[index]}
          </button>
        ))}
      </div>
      <Origin className="opens__part" open={open} {...way}>
        <p data-surface="window">{text}</p>
      </Origin>
    </div>
  )
}

export function Deciphers(props: { label: string; texts: string[]; heading: string }) {
  const [shown, setShown] = useState(0)

  return (
    <div className="played">
      <button
        className="play"
        onClick={() => setShown((shown + 1) % props.texts.length)}
        type="button"
      >
        {props.label}
      </button>
      <p className="t-mono">
        <Decipher>{props.texts[shown]}</Decipher>
      </p>
      <p className="t-heading">{props.heading}</p>
    </div>
  )
}

// A halftone: dots that get smaller over a circle.
export function disc(pitch: number, width: number): Picture {
  const cols = Math.floor(width / pitch)
  const cover = Array.from({ length: cols * cols }, (_, cell) => {
    const far = Math.hypot((cell % cols) + 0.5 - cols / 2, Math.floor(cell / cols) + 0.5 - cols / 2)
    return Math.round(100 * Math.sqrt(Math.max(0, 1 - far / (cols / 2))))
  })
  return { step: pitch, cols, rows: cols, cover }
}

// A ring: one dot every pitch along a circle.
function ring(pitch: number, width: number): Picture {
  const cols = Math.floor(width / pitch)
  const radius = cols / 2 - 2
  const count = Math.round(2 * Math.PI * radius)
  const points = Array.from({ length: count }, (_, dot): [number, number] => [
    cols / 2 - 0.5 + radius * Math.cos((2 * Math.PI * dot) / count),
    cols / 2 - 0.5 + radius * Math.sin((2 * Math.PI * dot) / count),
  ])
  return { step: pitch, cols, rows: cols, points }
}

export function Pictures({ caps }: { caps: string[] }) {
  return (
    <div className="stage spec" data-surface="window">
      {[disc, ring].map((picture, index) => (
        <Cap key={index} label={caps[index]}>
          <div style={{ width: u(30) }}>
            <Liquid picture={picture} />
          </div>
        </Cap>
      ))}
    </div>
  )
}
