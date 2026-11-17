import Image from 'next/image'
import type { ReactNode } from 'react'

import type { IconName } from '../atoms/Icon'
import { Dots } from '../molecules/Dots'
import { Row } from '../molecules/Row'
import { Opens, List as Rows } from '../organisms/List'
import { Section, type Surface } from './Section'

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
  foot?: { href: string; label: string; lang?: string } | null
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

// The rows of a list, which a list that joins the section above stands in under that one's heading.
export function Items(props: Props) {
  return (
    <Rows empty={props.empty} foot={props.foot} head={props.head}>
      {props.items.map((item, at) => row(item, at, props))}
    </Rows>
  )
}

// Rows under a heading: steps, navigation, the groups of a record; a headed list holds its title in its head.
export function List(
  props: Props & {
    title?: string | null
    text?: string | null
    split?: boolean
    surface?: Surface
    children?: ReactNode
  },
) {
  return (
    <Section split={props.split} surface={props.surface} text={props.text} title={props.title}>
      <Items {...props} />
      {props.children}
    </Section>
  )
}
