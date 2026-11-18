'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { type ComponentProps, type ReactNode, useId, useState } from 'react'

import { Icon, type IconName } from '../atoms/Icon'
import { Dots } from '../molecules/Dots'
import { Link } from '../molecules/Link'
import { Row } from '../molecules/Row'
import { Decipher } from '../motion/Decipher'
import { useArrives } from '../motion/enters'
import { Origin } from '../motion/Origin'
import { curve, duration, reduced, usePainted } from '../motion/vocabulary'
import { Message } from './Message'
import { Preview, type PreviewProps } from './Preview'

// Where a foot leads, in the language its words are in where that is not the page's; a file downloads.
type To = { href: string; label: string; lang?: string; download?: boolean }

// What an empty list offers, as when a filter leaves nothing.
type Reset = { label: string; onClick: () => void }

// Rows under one another, past the text on both sides so the hover fill has room, that arrive along the spread; a head
// names them and their end, a foot counts what is shown of how many and leads on, and a list with no rows says so in
// one line, which appears as it comes.
export function List(props: {
  head?: { title?: string | null; end: string } | null
  // Rows under a head that are checked one by one, not read through, keep their lines.
  lines?: boolean
  foot?: To | null
  count?: string | null
  empty?: string | null
  reset?: Reset | null
  // Rows that move by themselves as they change.
  moving?: boolean
  // On a record every row closes with a line in the foreground, edge to edge.
  ruled?: boolean
  children: ReactNode
}) {
  const { head, foot, count, empty } = props
  const list = useArrives()

  if (empty)
    return (
      <Origin open speed="slow">
        <Message action={props.reset} text={empty} />
      </Origin>
    )
  return (
    <div
      className="list"
      data-headed={head ? (props.lines ? 'lines' : '') : undefined}
      data-ruled={props.ruled ? '' : undefined}
      ref={props.moving ? undefined : list}
    >
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
      {(foot || count) && (
        <div className="list__foot">
          {count && (
            <span className="list__count">
              <Decipher>{count}</Decipher>
            </span>
          )}
          {foot && (
            <Link download={foot.download} href={foot.href} hrefLang={foot.lang} lang={foot.lang}>
              {foot.label}
              {foot.download ? (
                <Icon name="arrow-down" size="s" />
              ) : (
                !/^https?:/.test(foot.href) && <Icon name="arrow-right" size="s" />
              )}
            </Link>
          )}
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
  // An item that can come and go as its list changes, the place it holds in the whole list, and its language.
  key?: string | null
  place?: number
  lang?: string
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
  // What it shows as its row opens.
  preview?: PreviewProps | null
}

type Props = {
  large?: boolean
  lead?: 'none' | 'index' | 'icon' | 'picture'
  opens?: boolean
  head?: { title?: string | null; end: string } | null
  lines?: boolean
  items: Item[]
  foot?: To | null
  count?: string | null
  empty?: string | null
  reset?: Reset | null
}

// What a row of an item says: a name beside what it says, which then holds the index, a meter over its lines, its end
// text, and its lead.
function slots(item: Item, at: number, { large, lead }: Props) {
  const index = lead === 'index' ? String((item.place ?? at) + 1).padStart(2, '0') : undefined
  const { meter, picture } = item
  const lines = [
    ...(meter ? [<Dots count={meter.of} key="meter" label={meter.label} on={meter.on} />] : []),
    ...(item.text ?? []),
  ]
  return {
    lines,
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
}

// An item is one row, which leads where it leads; a row that opens shows its lines once opened.
function row(item: Item, at: number, props: Props) {
  const { lines, ...rest } = slots(item, at, props)
  const { href } = item
  if (props.opens && lines.length) return <Opens key={at} {...rest} lines={lines} />
  return (
    <Row
      current={item.current || undefined}
      end={href ? (/^https?:/.test(href) ? 'arrow-up-right' : 'arrow-right') : undefined}
      href={href ?? undefined}
      key={at}
      lang={item.lang}
      {...rest}
      text={lines}
    />
  )
}

// A row that opens to a preview of its item, which grows in under it and leaves as it closes.
function Previewed(props: {
  item: Item
  at: number
  list: Props
  open: boolean
  toggle: () => void
}) {
  const { item, open } = props
  const { lines, ...rest } = slots(item, props.at, props.list)
  const id = useId()

  return (
    <>
      <Row
        {...rest}
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        end={open ? 'minus' : 'plus'}
        onClick={props.toggle}
        text={lines}
      />
      <Origin open={open} speed="slow">
        <Preview id={id} label={item.name ?? item.title} {...item.preview!} />
      </Origin>
    </>
  )
}

// What arrives rises a step into place as it fades in, after the ones before it along the spread; what leaves fades.
const step = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s-6'))
const moves = {
  wait: () => ({ opacity: 0, y: step() }),
  in: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: duration('slow'), ease: curve('enter'), delay },
  }),
  out: () => ({ opacity: 0, transition: { duration: duration('slow-exit'), ease: curve('exit') } }),
}
const fades = {
  wait: { opacity: 0 },
  in: () => ({ opacity: 1, transition: { duration: duration('slow'), ease: curve('standard') } }),
  out: () => ({ opacity: 0, transition: { duration: duration('slow'), ease: curve('standard') } }),
}

// Items that change as a filter does, one open at a time: rows that stay slide, rows that go leave and new rows arrive
// along the spread, or with reduced motion the whole list crossfades, while what the server painted is simply there.
function Moving(props: Props) {
  const painted = usePainted()
  const keys = props.items.map(({ key }) => key!)
  const now = keys.join(' ')
  const [open, setOpen] = useState(props.opens ? (keys[0] ?? null) : null)
  // Each change is a new version of the list, and the rows it brings arrive in their order along the spread.
  const [shown, setShown] = useState({ now, version: 0, arriving: keys })
  if (shown.now !== now) {
    const was = shown.now.split(' ')
    setShown({
      now,
      version: shown.version + 1,
      arriving: keys.filter((key) => !was.includes(key)),
    })
    if (props.opens && (open === null || !keys.includes(open))) setOpen(keys[0] ?? null)
  }
  const { arriving } = shown
  const still = painted || reduced()

  return (
    <List
      count={props.count}
      empty={props.empty}
      foot={props.foot}
      head={props.head}
      lines={props.lines}
      moving
      reset={props.reset}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <m.div
          animate="in"
          className="list__rows"
          exit="out"
          initial="wait"
          key={still && !painted ? shown.version : 0}
          variants={painted ? undefined : fades}
        >
          <AnimatePresence initial={!painted} mode="popLayout">
            {props.items.map((item, at) => (
              <m.div
                animate="in"
                className="list__item"
                custom={
                  still || !arriving.includes(item.key!)
                    ? 0
                    : (duration('spread') * arriving.indexOf(item.key!)) / arriving.length
                }
                data-open={open === item.key ? '' : undefined}
                exit="out"
                initial="wait"
                key={item.key}
                lang={item.lang}
                layout={still ? false : 'position'}
                transition={
                  still
                    ? undefined
                    : { layout: { duration: duration('slow'), ease: curve('standard') } }
                }
                variants={still ? undefined : moves}
              >
                {item.preview ? (
                  <Previewed
                    at={at}
                    item={item}
                    list={props}
                    open={open === item.key}
                    toggle={() => setOpen(open === item.key ? null : item.key!)}
                  />
                ) : (
                  row(item, at, props)
                )}
              </m.div>
            ))}
          </AnimatePresence>
        </m.div>
      </AnimatePresence>
    </List>
  )
}

// The rows of a list from its items, which a list that joins the section above stands in under that one's heading;
// the items of a window move as they change.
export function Items(props: Props) {
  if (props.items.some((item) => item.key)) return <Moving {...props} />
  return (
    <List
      count={props.count}
      empty={props.empty}
      foot={props.foot}
      head={props.head}
      lines={props.lines}
      reset={props.reset}
    >
      {props.items.map((item, at) => row(item, at, props))}
    </List>
  )
}
