import type { Block } from 'payload'

import { frame } from '../frame'

// Figures and what they count, one to three across.
export const Stats: Block = {
  slug: 'stats',
  interfaceName: 'StatsBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/stats.png', alt: 'Preview of the Stats section' },
    },
  },
  fields: [
    ...frame({ split: true, join: true, surface: true }),
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Figure', plural: 'Figures' },
      minRows: 1,
      maxRows: 3,
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'value', type: 'text', required: true, admin: { width: '33%' } },
            { name: 'label', type: 'text', required: true, admin: { width: '67%' } },
          ],
        },
      ],
    },
  ],
}
