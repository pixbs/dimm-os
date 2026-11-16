import type { Condition, Field, SelectField } from 'payload'

// The surfaces a section runs on, edge to edge.
export const surface: SelectField = {
  name: 'surface',
  type: 'select',
  defaultValue: 'window',
  required: true,
  options: [
    { label: 'Window', value: 'window' },
    { label: 'Paper', value: 'paper' },
    { label: 'Orange', value: 'orange' },
    { label: 'Blue', value: 'blue' },
    { label: 'Mint', value: 'mint' },
  ],
}

// A joined section shares the heading of the one above, so it has none of its own.
const own: Condition = (_, siblingData) => !siblingData?.join
const titled: Condition = (data, siblingData, context) =>
  own(data, siblingData, context) && Boolean(siblingData?.title)

// What every section shares; each takes only the options its design gives it.
export function frame(options: { split?: boolean; join?: boolean }): Field[] {
  return [
    ...(options.join
      ? [
          {
            name: 'join',
            type: 'checkbox',
            label: 'Continues the section above',
            admin: { description: 'Shares its heading.' },
          } satisfies Field,
        ]
      : []),
    { name: 'title', type: 'text', admin: { condition: own } },
    { name: 'text', type: 'textarea', admin: { condition: titled } },
    ...(options.split
      ? [
          {
            name: 'split',
            type: 'checkbox',
            label: 'Heading beside the body',
            defaultValue: true,
            admin: { condition: titled, description: 'In a wide window.' },
          } satisfies Field,
        ]
      : []),
  ]
}
