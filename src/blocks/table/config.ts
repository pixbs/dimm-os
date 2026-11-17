import type { Block, Condition } from 'payload'

import { frame } from '../frame'

// A third cell is asked for only where the table has a third column.
const three: Condition = (_, __, { blockData }) =>
  ((blockData as { columns?: unknown[] } | undefined)?.columns?.length ?? 0) > 2

// Rows with two or three columns, which fold in a compact window.
export const Table: Block = {
  slug: 'table',
  interfaceName: 'TableBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/table.png', alt: 'Preview of the Table section' },
    },
  },
  fields: [
    ...frame({ join: true, surface: true }),
    {
      name: 'columns',
      type: 'array',
      labels: { singular: 'Column', plural: 'Columns' },
      minRows: 2,
      maxRows: 3,
      required: true,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'rows',
      type: 'array',
      labels: { singular: 'Row', plural: 'Rows' },
      minRows: 1,
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'first', type: 'text', required: true },
            { name: 'second', type: 'text' },
            { name: 'third', type: 'text', admin: { condition: three } },
          ],
        },
      ],
    },
  ],
}
