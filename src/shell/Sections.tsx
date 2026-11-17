import type { FactsView } from '@/blocks/facts/view'
import type { HeaderView } from '@/blocks/header/view'
import type { ListView } from '@/blocks/list/view'
import type { MediaView } from '@/blocks/media/view'
import type { QuoteView } from '@/blocks/quote/view'
import type { StatsView } from '@/blocks/stats/view'
import type { TableView } from '@/blocks/table/view'
import type { TextView } from '@/blocks/text/view'
import { Row } from '@/ds/molecules/Row'
import { Items, List } from '@/ds/organisms/List'
import { Prose } from '@/ds/organisms/Prose'
import { Stats as Figures } from '@/ds/organisms/Stats'
import { Table as Rows } from '@/ds/organisms/Table'
import { Facts } from '@/ds/sections/Facts'
import { Header } from '@/ds/sections/Header'
import { List as Listed } from '@/ds/sections/List'
import { Media } from '@/ds/sections/Media'
import { Quote } from '@/ds/sections/Quote'
import { Stats } from '@/ds/sections/Stats'
import { Table } from '@/ds/sections/Table'
import { Text } from '@/ds/sections/Text'

type Joinable = TextView | StatsView | FactsView | TableView | ListView
type Placed = HeaderView | MediaView | QuoteView | Joinable

// A gallery folds to the window's width, one across when compact and two at most when regular, and a picture is asked
// for at the share its column takes.
const across = (columns: number, width: number) =>
  width < 600 ? 1 : width < 960 ? Math.min(columns, 2) : columns

// The body of a section that joins the one above, under that section's heading.
function Part({ part }: { part: Joinable }) {
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
      return <Items {...part} />
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
    const parts = joined.map((part, index) => <Part key={index} part={part} />)
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
      case 'list':
        return (
          <Listed {...lead} key={at} split={lead.split && beside}>
            {parts}
          </Listed>
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
