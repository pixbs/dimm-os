import type { Block, Condition, Field, NumberFieldSingleValidation } from 'payload'
import { number } from 'payload/shared'

import { icons } from '@/ds/atoms/icons'
import { address, buttons } from '@/fields/link'

import { frame } from '../frame'

// What an item asks for follows what its list leads with and what its rows do.
const when =
  (option: 'lead' | 'rows', value: string): Condition =>
  (_, __, { blockData }) =>
    (blockData as Record<string, unknown> | undefined)?.[option] === value
const named: Condition = (_, siblingData) => Boolean(siblingData?.name)

// A list with an end label is headed: its title stands in the head of the rows, with no sentence under it.
const headless = (field: Field): Field => {
  if (!('name' in field) || !['text', 'split'].includes(field.name)) return field
  const shown = field.admin?.condition
  return {
    ...field,
    admin: {
      ...field.admin,
      condition: (data, siblingData, context) =>
        !siblingData?.endLabel && (shown?.(data, siblingData, context) ?? true),
    },
  } as Field
}

// The dots a meter lights, never more than it has.
const lit: NumberFieldSingleValidation = (value, options) =>
  value == null || value <= ((options.siblingData as { of?: number }).of ?? 0)
    ? number(value, options)
    : 'At most the number of dots.'

// Rows of items: steps, navigation, the groups of a record.
export const List: Block = {
  slug: 'list',
  interfaceName: 'ListBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/list.png', alt: 'Preview of the List section' },
    },
  },
  fields: [
    ...frame({ split: true, join: true, surface: true }).map(headless),
    {
      type: 'row',
      fields: [
        {
          name: 'lead',
          type: 'select',
          defaultValue: 'none',
          required: true,
          options: [
            { label: 'Nothing', value: 'none' },
            { label: 'Index', value: 'index' },
            { label: 'Icon', value: 'icon' },
            { label: 'Picture', value: 'picture' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'rows',
          type: 'select',
          defaultValue: 'plain',
          required: true,
          options: [
            { label: 'Plain', value: 'plain' },
            { label: 'Links', value: 'link' },
            { label: 'Open in place', value: 'opens' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'large',
          type: 'checkbox',
          label: 'Heading scale',
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'endLabel',
      type: 'text',
      label: 'End label',
      admin: { description: 'Heads the end texts, with the title beside it.' },
    },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', admin: { width: '50%' } },
            { name: 'caption', type: 'text', admin: { condition: named, width: '50%' } },
          ],
        },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea', admin: { description: 'A line each.' } },
        {
          type: 'row',
          fields: [
            { name: 'end', type: 'text', label: 'End text', admin: { width: '50%' } },
            {
              name: 'share',
              type: 'number',
              label: 'Meter',
              min: 0,
              validate: lit,
              admin: { description: 'Dots lit.', width: '25%' },
            },
            {
              name: 'of',
              type: 'number',
              min: 1,
              max: 12,
              admin: { description: 'Dots in all.', width: '25%' },
            },
          ],
        },
        {
          name: 'icon',
          type: 'select',
          options: Object.keys(icons),
          required: true,
          admin: { condition: when('lead', 'icon') },
        },
        {
          name: 'picture',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: { condition: when('lead', 'picture') },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'window',
              type: 'relationship',
              relationTo: 'windows',
              admin: { condition: when('rows', 'link'), width: '50%' },
            },
            {
              name: 'url',
              type: 'text',
              label: 'Address',
              validate: address,
              admin: {
                condition: when('rows', 'link'),
                description: 'Where no window is chosen.',
                width: '50%',
              },
            },
          ],
        },
      ],
    },
    {
      ...buttons('foot'),
      label: 'Foot',
      labels: { singular: 'Link', plural: 'Links' },
      maxRows: 1,
      admin: {},
    },
  ],
}
