import type { Block } from 'payload'

import { buttons } from '@/fields/link'

import { surface } from '../frame'

// Opens a window, the one place its title lives; at the heading level on an accent it closes the window as a call.
export const Header: Block = {
  slug: 'header',
  interfaceName: 'HeaderBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/header.png', alt: 'Preview of the Header section' },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'level',
          type: 'select',
          defaultValue: 'title',
          required: true,
          options: [
            { label: 'Display', value: 'display' },
            { label: 'Title', value: 'title' },
            { label: 'Heading', value: 'heading' },
          ],
          admin: { width: '50%' },
        },
        { ...surface, admin: { width: '50%' } },
      ],
    },
    { name: 'title', type: 'text', required: true },
    { name: 'text', type: 'textarea' },
    buttons('actions'),
  ],
}
