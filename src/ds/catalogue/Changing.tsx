'use client'

import { type ReactNode, useState } from 'react'

import { Lamps } from '../molecules/Lamps'
import { Media } from '../molecules/Media'
import { Path } from '../molecules/Path'
import type { Source } from '../molecules/Picture'
import { Liquid } from '../motion/Liquid'
import { disc } from './Moves'
import { Cap, Stage, width } from './parts'

// A specimen under the button that changes it: each press shows the next of its values.
function Changes(props: { label: string; count: number; children: (at: number) => ReactNode }) {
  const [at, setAt] = useState(0)

  return (
    <div className="played">
      <button className="play" onClick={() => setAt((at + 1) % props.count)} type="button">
        {props.label}
      </button>
      {props.children(at)}
    </div>
  )
}

export function PathChange({ label, paths }: { label: string; paths: string[][] }) {
  return (
    <Changes count={paths.length} label={label}>
      {(at) => (
        <Stage>
          <Path segments={paths[at]} />
        </Stage>
      )}
    </Changes>
  )
}

const times = [
  ['16:44', '16:45'],
  ['09:05', '09:06'],
]

// The same time at three pitches, and another on paper.
export function LampsChange({ label, caps }: { label: string; caps: string[] }) {
  return (
    <Changes count={2} label={label}>
      {(at) => (
        <div className="spec">
          {['8', '5', '12'].map((pitch, index) => (
            <Cap key={pitch} label={caps[index]}>
              <div className="stage" data-pitch={pitch} data-surface="window">
                <Lamps time={times[0][at]} />
              </div>
            </Cap>
          ))}
          <Cap label={caps[3]}>
            <Stage surface="paper">
              <Lamps time={times[1][at]} />
            </Stage>
          </Cap>
        </div>
      )}
    </Changes>
  )
}

// Pressed, the picture comes again as if it had just arrived.
export function PictureAgain({ label, picture }: { label: string; picture: Source }) {
  return (
    <Changes count={Number.MAX_SAFE_INTEGER} label={label}>
      {(at) => (
        <Stage flush width={width.popover}>
          <Media key={at} picture={picture} />
        </Stage>
      )}
    </Changes>
  )
}

export function LivePicture({ picture }: { picture: Source }) {
  return (
    <Stage flush width={width.popover}>
      <Media live={<Liquid picture={disc} />} picture={picture} ratio="1:1" />
    </Stage>
  )
}
