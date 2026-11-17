import type { ComponentProps } from 'react'

import { Avatar } from '../molecules/Media'

// Words that are not the author's, in Heading, with who said them; without a picture the avatar shows the dot grid.
export function Quote(props: {
  text: string
  name: string
  role?: string | null
  avatar?: ComponentProps<typeof Avatar>['picture'] | null
}) {
  return (
    <figure className="quote">
      <blockquote className="quote__text">{props.text}</blockquote>
      <figcaption className="quote__by">
        <Avatar picture={props.avatar ?? undefined} />
        <span>
          <span className="quote__name">{props.name}</span>
          {props.role && <span className="quote__role">{props.role}</span>}
        </span>
      </figcaption>
    </figure>
  )
}
