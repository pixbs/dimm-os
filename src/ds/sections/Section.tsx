'use client'

import type { ReactNode } from 'react'

import { Heading } from '../molecules/Heading'
import { useEnters } from '../motion/enters'

export type Surface = 'window' | 'paper' | 'orange' | 'blue' | 'mint'

// What every section shares: a heading at the heading level above its body, or beside it in a wide window, and a
// surface edge to edge. A section that enters by scroll plays once.
export function Section(props: {
  title?: string | null
  text?: string | null
  split?: boolean
  surface?: Surface
  // Its body runs to the window's edges; the heading keeps the inset.
  bleed?: boolean
  // Its number in the index of its window, which a link to it moves the focus to.
  eyebrow?: string
  id?: string
  children: ReactNode
}) {
  const { title, text, split, surface, bleed, eyebrow, id } = props
  const part = useEnters()

  return (
    <section
      className="section"
      data-bleed={bleed ? '' : undefined}
      data-layout={split ? 'split' : undefined}
      // On the window's own surface it takes the window's, which may be paper.
      data-surface={surface === 'window' ? undefined : surface}
      id={id}
      ref={part}
      tabIndex={id ? -1 : undefined}
    >
      {title && (
        <div className="section__head">
          <Heading eyebrow={eyebrow} level="heading" text={text} title={title} />
        </div>
      )}
      <div className="section__body">{props.children}</div>
    </section>
  )
}
