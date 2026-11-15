import type { Copy } from './copy/en'
import { Doc, Entry, Table } from './parts'

const cells = ['t-medium', 'c-muted', 'c-muted']

export function Index({ t }: { t: Copy['index'] }) {
  return (
    <Doc text={t.doc}>
      <Entry text={t.layers}>
        <Table classes={cells} columns="20 25 1fr" head={t.layersHead} rows={t.layersRows} />
      </Entry>
      <Entry text={t.shared}>
        <Table classes={cells} columns="20 1fr 1fr" head={t.sharedHead} rows={t.sharedRows} />
      </Entry>
      <Entry text={t.rules}>
        <Table
          classes={cells}
          columns="6 1fr"
          head={t.rulesHead}
          rows={t.rulesRows.map((rule, index) => [String(index + 1).padStart(2, '0'), rule])}
        />
      </Entry>
    </Doc>
  )
}
