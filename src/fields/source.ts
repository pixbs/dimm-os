import type { Condition, Field, RelationshipFieldSingleValidation } from 'payload'
import { relationship } from 'payload/shared'

// Where a section's items come from: written in it, or the items of a window, which can have them.
export const listing: Condition = (_, siblingData) => siblingData?.source === 'window'
export const written: Condition = (_, siblingData) => siblingData?.source !== 'window'

export const source: Field = {
  type: 'row',
  fields: [
    {
      name: 'source',
      type: 'select',
      defaultValue: 'items',
      options: [
        { label: 'Its own items', value: 'items' },
        { label: 'The items of a window', value: 'window' },
      ],
      admin: { width: '50%' },
    },
    {
      name: 'from',
      type: 'relationship',
      relationTo: 'windows',
      label: 'Window',
      filterOptions: { parent: { exists: false } },
      validate: ((value, options) =>
        (options.siblingData as { source?: string }).source === 'window' && !value
          ? 'Choose the window whose items it shows.'
          : relationship(value, options)) satisfies RelationshipFieldSingleValidation,
      admin: { condition: listing, width: '50%' },
    },
  ],
}
