import { Facts } from '../sections/Facts'
import { Table } from '../sections/Table'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, Widths } from './parts'

export function Collections({ t, widths }: { t: Copy['collections']; widths: string[] }) {
  const [split, three] = t.caps
  const facts = [t.value, t.value, t.long, t.value].map((value) => ({ label: t.label, value }))
  const rows = [t.cell, t.wraps, t.cell].map((first) => [first, t.cell, t.cell])

  return (
    <Doc text={t.doc}>
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
