'use client'

import { type ComponentProps, type ReactNode, useState } from 'react'

import { Icon } from '../atoms/Icon'
import { Link } from '../molecules/Link'
import { Row } from '../molecules/Row'
import { useArrives } from '../motion/enters'
import { Origin } from '../motion/Origin'
import { Message } from './Message'

// Where a foot leads, in the language its words are in where that is not the page's.
type To = { href: string; label: string; lang?: string }

// Rows under one another, past the text on both sides so the hover fill has room, that arrive along the spread; a head
// names them and their end, a foot leads on, and a list with no rows says so in one line.
export function List(props: {
  head?: { title?: string | null; end: string } | null
  foot?: To | null
  empty?: string | null
  children: ReactNode
}) {
  const { head, foot, empty } = props
  const list = useArrives()

  if (empty) return <Message text={empty} />
  return (
    <div className="list" data-headed={head ? '' : undefined} ref={list}>
      {head && <Row className="row list__head" meta={head.end} title={head.title} />}
      {props.children}
      {foot && (
        <div className="list__foot">
          <Link href={foot.href} hrefLang={foot.lang} lang={foot.lang}>
            {foot.label}
            {!/^https?:/.test(foot.href) && <Icon name="arrow-right" size="s" />}
          </Link>
        </div>
      )}
    </div>
  )
}

// A row that opens in place: what it says beyond its title comes under it, and leaves again as it closes.
export function Opens({ lines, ...row }: ComponentProps<typeof Row> & { lines: ReactNode[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Row
      {...row}
      aria-expanded={open}
      end={open ? 'minus' : 'plus'}
      onClick={() => setOpen(!open)}
      text={
        <Origin className="list__lines" inline open={open} speed="fast">
          {lines.map((line, at) => (
            <span className="row__text" key={at}>
              {line}
            </span>
          ))}
        </Origin>
      }
    />
  )
}
