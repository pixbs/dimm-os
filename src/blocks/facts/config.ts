import type { Block } from 'payload'

import { frame } from '../frame'

// Pairs of label and value.
export const Facts: Block = {
  slug: 'facts',
  interfaceName: 'FactsBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/facts.png', alt: 'Preview of the Facts section' },
    },
  },
  fields: [
    ...frame({ split: true, join: true, surface: true }),
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Fact', plural: 'Facts' },
      minRows: 1,
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { width: '33%' } },
            { name: 'value', type: 'text', required: true, admin: { width: '67%' } },
          ],
        },
      ],
    },
  ],
}
