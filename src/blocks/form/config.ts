import type { Block } from 'payload'

import { frame } from '../frame'

// Any form of the form builder, under a heading, with a note above its button.
export const Form: Block = {
  slug: 'form',
  interfaceName: 'FormBlock',
  fields: [
    ...frame({ split: true, surface: true }),
    { name: 'form', type: 'relationship', relationTo: 'forms', required: true },
    { name: 'note', type: 'textarea' },
  ],
}
