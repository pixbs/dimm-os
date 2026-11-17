import type { Block, Condition } from 'payload'

import { frame } from '../frame'

// Columns are a question only once there is more than one picture.
const many: Condition = (_, siblingData) => (siblingData?.items?.length ?? 0) > 1

// One picture, a gallery of them, or one edge to edge.
export const Media: Block = {
  slug: 'media',
  interfaceName: 'MediaBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/media.png', alt: 'Preview of the Media section' },
    },
  },
  fields: [
    ...frame({}),
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Picture', plural: 'Pictures' },
      minRows: 1,
      required: true,
      fields: [
        { name: 'picture', type: 'upload', relationTo: 'media', required: true },
        // The caption belongs to this use of the picture, not to its file.
        { name: 'caption', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'columns',
          type: 'select',
          defaultValue: '1',
          required: true,
          options: ['1', '2', '3'],
          admin: { condition: many, width: '33%' },
        },
        {
          name: 'ratio',
          type: 'select',
          defaultValue: '16:9',
          required: true,
          options: ['16:9', '4:3', '1:1'],
          admin: { width: '33%' },
        },
        {
          name: 'bleed',
          type: 'checkbox',
          label: 'Edge to edge',
          admin: { width: '33%' },
        },
      ],
    },
  ],
}
