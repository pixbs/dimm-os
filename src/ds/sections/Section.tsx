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
  children: ReactNode
}) {
  const { title, text, split, surface } = props
  const part = useEnters()

  return (
    <section
      className="section"
      data-layout={split ? 'split' : undefined}
      // On the window's own surface it takes the window's, which may be paper.
      data-surface={surface === 'window' ? undefined : surface}
      ref={part}
    >
      {title && (
        <div className="section__head">
          <Heading level="heading" text={text} title={title} />
        </div>
      )}
      <div className="section__body">{props.children}</div>
    </section>
  )
}
