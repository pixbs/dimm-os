import type { ReactNode } from 'react'

// A small system label in mono: filled with a line, or with the surface it is given; a dot may lead it.
export function Tag(props: {
  dot?: 'on' | 'signal'
  surface?: 'inverted' | 'orange'
  children: ReactNode
}) {
  return (
    <span className="tag" data-surface={props.surface}>
      {props.dot && (
        <span className="dot" data-tone={props.dot === 'signal' ? 'signal' : undefined} />
      )}
      {props.children}
    </span>
  )
}
