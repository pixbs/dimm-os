'use client'

import { type MouseEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'

import type { WindowView } from '@/data/views'
import { Bar, BarSpace, BarText, BarTitle } from '@/ds/molecules/Bar'
import { Button } from '@/ds/molecules/Button'
import { Heading } from '@/ds/molecules/Heading'
import { Row } from '@/ds/molecules/Row'
import { reduced } from '@/ds/motion/vocabulary'
import { List } from '@/ds/organisms/List'
import { RecordCard, RecordFoot, RecordHead } from '@/ds/organisms/Record'
import type { Dictionary } from '@/i18n/en'

export type Chapter = { id: string; number: string; title: string }

type Stamp = { code: string; note?: string }

// The chapter being read: the last whose heading has passed the top third of the window.
function useReading(chapters: Chapter[], page: RefObject<HTMLDivElement | null>) {
  const [at, setAt] = useState(0)
  const ids = chapters.map(({ id }) => id).join(' ')

  useEffect(() => {
    let view = page.current?.parentElement
    while (view && !/auto|scroll/.test(getComputedStyle(view).overflowY)) view = view.parentElement
    if (!view) return
    const scroller = view
    let frame = 0
    const read = () => {
      frame = 0
      const line = scroller.getBoundingClientRect().top + scroller.clientHeight / 3
      let passed = 0
      ids.split(' ').forEach((id, index) => {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= line) passed = index
      })
      setAt(passed)
    }
    const onScroll = () => (frame ||= requestAnimationFrame(read))
    read()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [ids, page])

  return at
}

// The index of a window's chapters as a record: each row leads to its chapter and moves the focus there, and the row of
// the chapter being read is held.
function Contents(props: {
  chapters: Chapter[]
  at: number
  stamp?: Stamp
  under: string
  t: Dictionary
  onGo: () => void
}) {
  const { chapters, at, t } = props
  const go = (event: MouseEvent, id: string) => {
    const chapter = document.getElementById(id)
    if (!chapter) return
    event.preventDefault()
    chapter.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' })
    chapter.focus({ preventScroll: true })
    props.onGo()
  }

  return (
    <RecordCard
      foot={<RecordFoot end={props.under} />}
      head={
        <RecordHead stamp={props.stamp}>
          <Heading level="heading" title={t.contents} />
        </RecordHead>
      }
      label={t.contents}
      name="index"
    >
      <List head={{ title: t.chapter, end: t.number }} ruled>
        {chapters.map(({ id, number, title }, index) => (
          <Row
            current={index === at}
            href={`#${id}`}
            key={id}
            meta={number}
            onClick={(event) => go(event, id)}
            size="compact"
            title={title}
          />
        ))}
      </List>
    </RecordCard>
  )
}

// A page whose content has a companion: an index of its chapters at the start, which a compact window leaves to a bar
// that opens it, or a record card at the end, which follows the lead below a wide window. Neither moves.
export function Page(props: {
  aside: NonNullable<WindowView['aside']>
  chapters: Chapter[]
  stamp?: Stamp
  // The buttons of a record card.
  foot: ReactNode
  lang?: string
  t: Dictionary
  children: ReactNode
}) {
  const { aside, chapters, t } = props
  const page = useRef<HTMLDivElement>(null)
  const at = useReading(chapters, page)
  const [open, setOpen] = useState(false)
  const start = aside.type === 'contents'
  const under =
    chapters.length > 0
      ? t.under.replace('{at}', chapters[at].number).replace('{of}', chapters.at(-1)!.number)
      : ''

  const card = start ? (
    chapters.length > 0 && (
      <Contents
        at={at}
        chapters={chapters}
        onGo={() => setOpen(false)}
        stamp={props.stamp}
        t={t}
        under={under}
      />
    )
  ) : (
    <RecordCard
      foot={props.foot}
      head={
        <RecordHead stamp={props.stamp}>
          {aside.title && <Heading level="heading" title={aside.title} />}
        </RecordHead>
      }
      label={aside.title ?? undefined}
      name="record"
    >
      <List ruled>
        {aside.facts.map(({ label, value }, index) => (
          <Row key={index} label={label} value={value} />
        ))}
      </List>
    </RecordCard>
  )

  return (
    <div className="page" data-aside={start ? 'start' : 'end'} ref={page}>
      {/* A compact window shows the bar and opens the card under it; a wider one shows the card alone. */}
      <div className="page__aside" data-open={open ? '' : undefined}>
        {start && chapters.length > 0 && (
          <Bar className="page__bar" line="below">
            <BarText>{under}</BarText>
            <BarTitle>{chapters[at].title}</BarTitle>
            <BarSpace />
            <Button
              aria-expanded={open}
              end="chevron-down"
              label={t.contents}
              onClick={() => setOpen(!open)}
            />
          </Bar>
        )}
        {card}
      </div>
      <div className="page__main" lang={props.lang}>
        {props.children}
      </div>
    </div>
  )
}
