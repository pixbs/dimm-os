import type { ArrayField } from 'payload'

// Rows of a label and its value, as a record or a plate lists them.
export function facts(name: string, label: string): ArrayField {
  return {
    name,
    type: 'array',
    label,
    labels: { singular: 'Fact', plural: 'Facts' },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'label', type: 'text', required: true },
          { name: 'value', type: 'text', required: true },
        ],
      },
    ],
  }
}
