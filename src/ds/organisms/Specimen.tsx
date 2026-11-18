import type { ReactNode } from 'react'

import { Heading } from '../molecules/Heading'
import { Media } from '../molecules/Media'
import { Tag } from '../molecules/Tag'

// A small window on a small desk with one of everything a setting of Accessibility can be seen on: the wallpaper's dots,
// the surface, a drawn cover, mono, a heading, text and a link. It is a picture: nothing on it is pressed or read out.
export function Specimen(props: {
  name: string
  caption: string
  title: string
  text: ReactNode
  // What the cover says while generated visuals are paused.
  paused?: string | null
}) {
  return (
    <div aria-hidden className="specimen" inert>
      <span className="specimen__wall dotted" />
      <div className="specimen__window" data-surface="window">
        <p className="specimen__bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="specimen__name">{props.name}</span>
        </p>
        <Media
          cover="orange"
          label={props.paused && <Tag dot="on">{props.paused}</Tag>}
          ratio="3:1"
        />
        <div className="specimen__text">
          <p className="t-mono c-muted">{props.caption}</p>
          <Heading level="lead" text={props.text} title={props.title} />
        </div>
      </div>
    </div>
  )
}
