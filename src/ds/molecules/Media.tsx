import Image from 'next/image'
import type { ReactNode } from 'react'

import { Picture, type Source } from './Picture'

export type MediaProps = {
  ratio?: '16:9' | '4:3' | '1:1' | '3:1'
  picture?: Source
  // One of the generated visuals, drawn over its picture once script runs.
  live?: ReactNode
  // A cover that is drawn, not uploaded: an accent under the halftone.
  cover?: 'orange' | 'blue' | 'mint'
  // A tag at its foot, and the button that plays a video or an embed.
  label?: ReactNode
  play?: ReactNode
  caption?: ReactNode
}

// A box with a fixed ratio that its content fills; empty, it shows the dot grid.
export function Media(props: MediaProps) {
  const { ratio, picture, live, cover, label, play, caption } = props

  return (
    <figure
      className="media"
      data-live={cover || live ? '' : undefined}
      data-ratio={ratio === '16:9' ? undefined : ratio}
    >
      <span className="media__box">
        {cover && (
          <>
            <span className="media__fill" data-surface={cover} />
            <span className="halftone media__form" data-mask="" />
          </>
        )}
        {picture && <Picture {...picture} live={live} />}
        {label && <span className="media__label">{label}</span>}
        {play && <span className="media__play">{play}</span>}
      </span>
      {caption && <figcaption className="media__caption">{caption}</figcaption>}
    </figure>
  )
}

// The box at a control size, or twice the regular one for whom a screen is about; named by initials or a glyph on its
// own surface, or filled by a picture, which says nothing the name beside it does not.
export function Avatar(props: {
  size?: 'compact' | 'large'
  surface?: 'raised' | 'paper'
  picture?: { src: string; position?: string }
  children?: ReactNode
}) {
  const { picture } = props
  const named = props.children !== undefined

  return (
    <span
      aria-hidden={named || undefined}
      className="avatar"
      data-named={named ? '' : undefined}
      data-size={props.size}
      data-surface={props.surface}
    >
      {picture && (
        // The smallest width of the short list is wider than the largest avatar, so that one is asked for.
        <Image
          alt=""
          fill
          sizes="96px"
          src={picture.src}
          style={picture.position ? { objectPosition: picture.position } : undefined}
        />
      )}
      {props.children}
    </span>
  )
}
