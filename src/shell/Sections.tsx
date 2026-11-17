import type { ComponentProps } from 'react'

import type { CardsView } from '@/blocks/cards/view'
import type { FactsView } from '@/blocks/facts/view'
import type { HeaderView } from '@/blocks/header/view'
import type { ListView } from '@/blocks/list/view'
import type { MediaView } from '@/blocks/media/view'
import type { QuoteView } from '@/blocks/quote/view'
import type { StatsView } from '@/blocks/stats/view'
import type { TableView } from '@/blocks/table/view'
import type { TextView } from '@/blocks/text/view'
import { Row } from '@/ds/molecules/Row'
import { type CardProps, Cards as Grid, Tiles } from '@/ds/organisms/Card'
import { Items, List } from '@/ds/organisms/List'
import { Prose } from '@/ds/organisms/Prose'
import { Stats as Figures } from '@/ds/organisms/Stats'
import { Table as Rows } from '@/ds/organisms/Table'
import { Cards } from '@/ds/sections/Cards'
import { Facts } from '@/ds/sections/Facts'
import { Header } from '@/ds/sections/Header'
import { List as Section } from '@/ds/sections/List'
import { Media } from '@/ds/sections/Media'
import { Quote } from '@/ds/sections/Quote'
import { Stats } from '@/ds/sections/Stats'
import { Table } from '@/ds/sections/Table'
import { Text } from '@/ds/sections/Text'

// A list as its filter and its limit leave it, each item with its place in the whole list.
type Listed = ListView & {
  items: (ListView['items'][number] & { place: number })[]
  count: string | null
  reset: ComponentProps<typeof Items>['reset']
}
type Joinable = TextView | StatsView | FactsView | TableView | Listed | CardsView
export type Placed = HeaderView | MediaView | QuoteView | Joinable

// A gallery folds to the window's width, one across when compact and two at most when regular, and a picture is asked
// for at the share its column takes.
const across = (columns: number, width: number) =>
  width < 600 ? 1 : width < 960 ? Math.min(columns, 2) : columns

// A card asks for its picture at the share its column takes; under a section's heading it ranks below it, and in a grid
// its picture is 4:3.
function cardsOf(cards: CardsView, width: number, first: boolean, under: boolean): CardProps[] {
  const span = Math.ceil(width / across(cards.columns, width))
  return cards.items.map(({ picture, href, ...item }, at) => ({
    ...item,
    href: href ?? undefined,
    under,
    media: picture
      ? {
          ratio: cards.tiles ? undefined : '4:3',
          picture: { ...picture, span, first: first && at === 0, still: Boolean(picture.live) },
        }
      : undefined,
  }))
}

// What an item shows as its row opens asks for its picture at the share the window gives it; the first on screen is
// neither lazy nor animated.
function rowsOf(list: Listed, width: number, first: boolean) {
  return list.items.map(({ preview, ...item }, at) => ({
    ...item,
    preview: preview && {
      text: preview.text,
      facts: preview.facts,
      action: preview.action,
      media: preview.picture
        ? {
            picture: {
              ...preview.picture,
              span: width,
              first: first && at === 0,
              still: Boolean(preview.picture.live),
            },
          }
        : undefined,
    },
  }))
}

// The body of a section that joins the one above, under that section's heading.
function Part({ part, width, under }: { part: Joinable; width: number; under: boolean }) {
  switch (part.type) {
    case 'text':
      return <Prose html={part.html} />
    case 'stats':
      return <Figures items={part.items} />
    case 'facts':
      return (
        <List>
          {part.items.map(({ label, value }, at) => (
            <Row key={at} label={label} value={value} />
          ))}
        </List>
      )
    case 'table':
      return <Rows columns={part.columns} rows={part.rows} />
    case 'list':
      return <Items {...part} items={rowsOf(part, width, false)} />
    case 'cards':
      return (
        <Grid columns={part.columns === 3 ? 3 : 2} items={cardsOf(part, width, false, under)} />
      )
  }
}

// The sections of a window in their order: a Header that opens it holds the title of the page, and a joined section
// stands in the body of the one above, under its heading.
export function Sections({ sections, width }: { sections: Placed[]; width: number }) {
  const groups: [Placed, ...Joinable[]][] = []
  for (const section of sections) {
    if ('join' in section && section.join) groups.at(-1)!.push(section)
    else groups.push([section])
  }
  // The first picture, when only a Header stands before it, is on screen as the window opens.
  const first = sections.find((section) => section.type !== 'header')

  return groups.map(([lead, ...joined], at) => {
    // A joined card ranks below the heading it stands under, where there is one.
    const parts = joined.map((part, index) => (
      <Part key={index} part={part} under={'title' in lead && Boolean(lead.title)} width={width} />
    ))
    // A table, or a list whose rows hold a name and an end text, takes three columns of its own, so the section it
    // stands in keeps its heading above, at three columns at most.
    const beside = ![lead, ...joined].some(
      (part) =>
        part.type === 'table' ||
        (part.type === 'list' && part.items.some(({ name, end }) => name && end)),
    )
    switch (lead.type) {
      case 'header':
        return <Header key={at} {...lead} page={at === 0} />
      case 'media':
        return (
          <Media
            bleed={lead.bleed}
            columns={lead.columns}
            items={lead.items.map(({ src, alt, caption, position, live }, index) => ({
              caption,
              picture: {
                src,
                alt,
                position,
                span: Math.ceil(width / across(lead.columns, width)),
                first: lead === first && index === 0,
                still: Boolean(live),
              },
            }))}
            key={at}
            ratio={lead.ratio}
            text={lead.text}
            title={lead.title}
          />
        )
      case 'quote':
        return (
          <Quote
            avatar={lead.avatar}
            key={at}
            name={lead.name}
            role={lead.role}
            surface={lead.surface}
            text={lead.text}
          />
        )
      case 'stats':
        return (
          <Stats
            items={lead.items}
            key={at}
            split={lead.split && beside}
            surface={lead.surface}
            text={lead.text}
            title={lead.title}
          >
            {parts}
          </Stats>
        )
      case 'facts':
        return (
          <Facts
            items={lead.items}
            key={at}
            split={lead.split && beside}
            surface={lead.surface}
            text={lead.text}
            title={lead.title}
          >
            {parts}
          </Facts>
        )
      case 'table':
        return (
          <Table
            columns={lead.columns}
            key={at}
            rows={lead.rows}
            surface={lead.surface}
            text={lead.text}
            title={lead.title}
          >
            {parts}
          </Table>
        )
      case 'cards':
        // Tiles fill the window with no frame, and hold the title of the page when they open it.
        return lead.tiles ? (
          <Tiles
            columns={lead.columns === 1 ? 1 : 2}
            items={cardsOf(lead, width, lead === first, false)}
            key={at}
            page={at === 0}
          />
        ) : (
          <Cards
            columns={lead.columns === 3 ? 3 : 2}
            items={cardsOf(lead, width, lead === first, Boolean(lead.title))}
            key={at}
            split={lead.split && beside}
            surface={lead.surface}
            text={lead.text}
            title={lead.title}
          >
            {parts}
          </Cards>
        )
      case 'list':
        return (
          <Section
            {...lead}
            items={rowsOf(lead, width, lead === first)}
            key={at}
            split={lead.split && beside}
          >
            {parts}
          </Section>
        )
      case 'text':
        return (
          <Text
            html={lead.html}
            key={at}
            split={lead.split && beside}
            text={lead.text}
            title={lead.title}
          >
            {parts}
          </Text>
        )
    }
  })
}
