'use client'

import Image from 'next/image'
import { type ComponentProps, type ReactNode, useState } from 'react'

import { Icon, type IconName } from '../atoms/Icon'
import { Dots } from '../molecules/Dots'
import { Link } from '../molecules/Link'
import { Row } from '../molecules/Row'
import { useArrives } from '../motion/enters'
import { Origin } from '../motion/Origin'
import { Message } from './Message'

// Where a foot leads, in the language its words are in where that is not the page's; a file downloads.
type To = { href: string; label: string; lang?: string; download?: boolean }

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
      {head && (
        <Row
          className="row list__head"
          meta={head.end}
          // Set in mono, the title of a headed group is still the heading a reader moves between.
          title={
            head.title && (
              <span aria-level={2} role="heading">
                {head.title}
              </span>
            )
          }
        />
      )}
      {props.children}
      {foot && (
        <div className="list__foot">
          <Link download={foot.download} href={foot.href} hrefLang={foot.lang} lang={foot.lang}>
            {foot.label}
            {foot.download ? (
              <Icon name="arrow-down" size="s" />
            ) : (
              !/^https?:/.test(foot.href) && <Icon name="arrow-right" size="s" />
            )}
          </Link>
        </div>
      )}
    </div>
  )
}

// A row that opens in place: what it says beyond its title comes under it, and leaves again as it closes.
function Opens({ lines, ...row }: ComponentProps<typeof Row> & { lines: ReactNode[] }) {
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

type Item = {
  name?: string | null
  caption?: string | null
  title: string
  text?: string[]
  end?: string | null
  meter?: { on: number; of: number; label: string } | null
  icon?: IconName | null
  picture?: { src: string; position: string } | null
  href?: string | null
  current?: boolean
}

type Props = {
  large?: boolean
  lead?: 'none' | 'index' | 'icon' | 'picture'
  opens?: boolean
  head?: { title?: string | null; end: string } | null
  items: Item[]
  foot?: To | null
  empty?: string | null
}

// An item is one row: a name beside what it says, which then holds the index, a meter over its lines, its end text,
// and where it leads; a row that opens shows its lines once opened.
function row(item: Item, at: number, { large, lead, opens }: Props) {
  const index = lead === 'index' ? String(at + 1).padStart(2, '0') : undefined
  const { meter, picture, href } = item
  const lines = [
    ...(meter ? [<Dots count={meter.of} key="meter" label={meter.label} on={meter.on} />] : []),
    ...(item.text ?? []),
  ]
  const slots = {
    scale: large ? ('heading' as const) : undefined,
    index: item.name ? undefined : index,
    icon: item.icon ?? undefined,
    // A picture says nothing its title does not; one this viewer may not read leaves the dot grid.
    media:
      lead === 'picture'
        ? picture && (
            <Image
              alt=""
              fill
              sizes="48px"
              src={picture.src}
              style={{ objectPosition: picture.position }}
            />
          )
        : undefined,
    side: item.name ? { index, title: item.name, text: item.caption ?? undefined } : undefined,
    title: item.title,
    meta: item.end ?? undefined,
  }
  if (opens && lines.length) return <Opens key={at} {...slots} lines={lines} />
  return (
    <Row
      current={item.current || undefined}
      end={href ? (/^https?:/.test(href) ? 'arrow-up-right' : 'arrow-right') : undefined}
      href={href ?? undefined}
      key={at}
      {...slots}
      text={lines}
    />
  )
}

// The rows of a list from its items, which a list that joins the section above stands in under that one's heading.
export function Items(props: Props) {
  return (
    <List empty={props.empty} foot={props.foot} head={props.head}>
      {props.items.map((item, at) => row(item, at, props))}
    </List>
  )
}
