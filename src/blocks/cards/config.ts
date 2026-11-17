import type {
  ArrayFieldValidation,
  Block,
  Condition,
  Field,
  SelectFieldSingleValidation,
} from 'payload'
import { array, select } from 'payload/shared'

import { buttons } from '@/fields/link'
import { source, written } from '@/fields/source'

import { frame } from '../frame'

// Tiles fill the window with no frame around them, so they have no heading, surface or join.
const framed = (field: Field): Field => {
  const shown = field.admin?.condition
  const own: Condition = (data, siblingData, context) =>
    !siblingData?.tiles && (shown?.(data, siblingData, context) ?? true)
  return { ...field, admin: { ...field.admin, condition: own } } as Field
}

// Cards stand two or three across, tiles one or two, so a window never holds more than three columns.
const across: SelectFieldSingleValidation = (value, options) => {
  const tiles = Boolean((options.siblingData as { tiles?: boolean }).tiles)
  const allowed = tiles ? ['1', '2'] : ['2', '3']
  return value && !allowed.includes(value)
    ? `${tiles ? 'Tiles' : 'Cards'} stand ${allowed.join(' or ')} across.`
    : select(value, options)
}

// Cards written by hand are at least one.
const some: ArrayFieldValidation = (value, options) =>
  (options.siblingData as { source?: string }).source !== 'window' && !value?.length
    ? 'Write a card, or show the items of a window.'
    : array(value, options)

// Cards in a grid under a heading, or tiles that fill the window as one statement.
export const Cards: Block = {
  slug: 'cards',
  interfaceName: 'CardsBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/cards.png', alt: 'Preview of the Cards section' },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'tiles',
          type: 'checkbox',
          label: 'Tiles',
          admin: { description: 'Fill the window, with no frame.', width: '50%' },
        },
        {
          name: 'columns',
          type: 'select',
          defaultValue: '2',
          required: true,
          options: ['1', '2', '3'],
          validate: across,
          admin: { width: '50%' },
        },
      ],
    },
    ...frame({ split: true, join: true, surface: true }).map(framed),
    source,
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Card', plural: 'Cards' },
      validate: some,
      admin: { condition: written },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true, admin: { width: '50%' } },
            {
              name: 'surface',
              type: 'select',
              defaultValue: 'raised',
              required: true,
              options: [
                { label: 'Raised', value: 'raised' },
                { label: 'Paper', value: 'paper' },
                { label: 'Orange', value: 'orange' },
                { label: 'Blue', value: 'blue' },
                { label: 'Mint', value: 'mint' },
              ],
              admin: { width: '50%' },
            },
          ],
        },
        { name: 'text', type: 'textarea' },
        { name: 'picture', type: 'upload', relationTo: 'media' },
        { ...buttons('actions'), maxRows: 2 },
      ],
    },
  ],
}
