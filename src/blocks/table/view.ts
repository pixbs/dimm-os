import type { TableBlock } from '@/payload-types'

import { framed } from '../framed'

export type TableView = Omit<ReturnType<typeof framed>, 'split'> & {
  type: 'table'
  surface: NonNullable<TableBlock['surface']>
  columns: string[]
  // A row has a cell for each column, empty where the admin left it so.
  rows: string[][]
}

export function table(block: TableBlock): TableView {
  const { split: _, ...frame } = framed(block)
  const columns = block.columns.map(({ label }) => label)
  return {
    type: 'table',
    ...frame,
    surface: block.surface ?? 'window',
    columns,
    rows: block.rows.map((row) =>
      [row.first, row.second ?? '', row.third ?? ''].slice(0, columns.length),
    ),
  }
}
