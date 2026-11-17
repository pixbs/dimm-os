import type { ReactNode } from 'react'

type Level = 'hero' | 'display' | 'title' | 'heading' | 'lead'

// The title is plain text, so a heading never mixes weights; the eyebrow says where you are, and a message of one line
// has no title.
export function Heading(props: {
  level?: Level
  eyebrow?: string
  title?: string
  text?: ReactNode
  // The title of the page, which a window holds once.
  page?: boolean
}) {
  const { level, eyebrow, title, text, page } = props
  const Title = page ? 'h1' : 'h2'

  return (
    <div className="hgroup" data-level={level === 'title' ? undefined : level}>
      {eyebrow && <p className="hgroup__eyebrow">{eyebrow}</p>}
      {title && <Title className="hgroup__title">{title}</Title>}
      {text && <p className="hgroup__text">{text}</p>}
    </div>
  )
}

// A figure and what it counts, in one style, so the label is never smaller than the value.
export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <p className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </p>
  )
}
