import { Facts } from '../sections/Facts'
import { List } from '../sections/List'
import { Table } from '../sections/Table'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, Widths } from './parts'

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
    </Doc>
  )
}
