import type { ReactNode } from 'react'

import { Travels } from '../motion/Travels'

// A small system label in mono: filled with a line, or with the surface it is given; a dot may lead it.
export function Tag(props: {
  dot?: 'on' | 'signal'
  surface?: 'inverted' | 'orange' | 'window'
  // The id of what travels here from another place.
  lands?: string
  children: ReactNode
}) {
  const look = { className: 'tag', 'data-surface': props.surface }
  const held = (
    <>
      {props.dot && (
        <span className="dot" data-tone={props.dot === 'signal' ? 'signal' : undefined} />
      )}
      {props.children}
    </>
  )

  return props.lands ? (
    <Travels {...look} id={props.lands} lands>
      {held}
    </Travels>
  ) : (
    <span {...look}>{held}</span>
  )
}
