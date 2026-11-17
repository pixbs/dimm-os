import type { Block } from 'payload'

import { surface } from '../frame'

// One quotation and who said it, with no heading but a surface of its own.
export const Quote: Block = {
  slug: 'quote',
  interfaceName: 'QuoteBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/quote.png', alt: 'Preview of the Quote section' },
    },
  },
  fields: [
    surface,
    { name: 'text', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'role', type: 'text', admin: { width: '50%' } },
      ],
    },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
  ],
}
