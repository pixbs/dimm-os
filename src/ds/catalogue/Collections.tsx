import { Tag } from '../molecules/Tag'
import { Tiles } from '../organisms/Card'
import { Cards } from '../sections/Cards'
import { Facts } from '../sections/Facts'
import { List } from '../sections/List'
import { Table } from '../sections/Table'
import type { Copy } from './copy/en'
import { Doc, Entry, Pane, Specs, u, Widths } from './parts'

export function Collections({ t, widths }: { t: Copy['collections']; widths: string[] }) {
  const [split, three] = t.caps
  const facts = [t.value, t.value, t.long, t.value].map((value) => ({ label: t.label, value }))
  const rows = [t.cell, t.wraps, t.cell].map((first) => [first, t.cell, t.cell])

  const thrice = <T,>(item: (at: number) => T) => [0, 1, 2].map(item)
  const lists = [
    <List
      foot={{ href: '/', label: t.all }}
      items={thrice(() => ({ title: t.item, end: t.meta, href: '#' }))}
      key="index"
      large
      lead="index"
      text={t.about}
      title={t.title}
    />,
    <List
      items={thrice(() => ({ title: t.item, text: [t.about] }))}
      key="steps"
      lead="index"
      split
      title={t.title}
    />,
    <List
      head={{ title: t.group, end: t.end }}
      items={thrice(() => ({ name: t.name, caption: t.about, title: t.about, end: t.meta }))}
      key="headed"
    />,
  ]

  const linked = thrice(() => ({
    href: '#',
    media: { ratio: '4:3' as const, label: <Tag>4:3</Tag> },
    meta: [<Tag key="tag">{t.label}</Tag>, t.meta],
    title: t.item,
    text: t.about,
    under: true,
  }))
  const written = (['paper', 'orange'] as const).map((surface) => ({
    surface,
    title: t.item,
    text: t.about,
    actions: [{ href: '#', label: t.label }],
  }))
  // Tiles fill a window as high as the frames draw it at each width.
  const panes = [
    [47, 65],
    [90, 50],
    [130, 55],
  ]

  return (
    <Doc text={t.doc}>
      <Entry text={t.list}>
        {lists.map((list, at) => (
          <Specs caps={[t.lists[at]]} key={at}>
            <Widths caps={widths}>{list}</Widths>
          </Specs>
        ))}
      </Entry>
      <Entry text={t.facts}>
        <Specs caps={[split]}>
          <Widths caps={widths}>
            <Facts items={facts} split title={t.title} />
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.table}>
        <Specs caps={[three]}>
          <Widths caps={widths}>
            <Table columns={[t.column, t.column, t.column]} rows={rows} title={t.title} />
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.cards}>
        <Specs caps={[t.cardCaps[0]]}>
          <Widths caps={widths}>
            <Cards columns={3} items={linked} title={t.title} />
          </Widths>
        </Specs>
        <Specs caps={[t.cardCaps[1]]}>
          <Widths caps={widths}>
            <Cards columns={2} items={written} />
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.tiles}>
        <Specs caps={widths}>
          {panes.map(([across, high]) => (
            <Pane height={u(high)} key={across} width={u(across)}>
              <Tiles
                columns={2}
                items={[
                  { surface: 'paper', title: t.short, media: { label: <Tag>{t.media}</Tag> } },
                  {
                    surface: 'orange',
                    title: t.statement,
                    actions: [{ href: '#', label: t.label }],
                  },
                ]}
              />
            </Pane>
          ))}
        </Specs>
      </Entry>
    </Doc>
  )
}
