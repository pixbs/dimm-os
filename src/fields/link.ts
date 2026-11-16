import type { ArrayField, Condition, TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

// A link to a window takes its title when it has no label.
const label: TextFieldSingleValidation = (value, options) =>
  value || (options.siblingData as { type?: string }).type === 'window'
    ? text(value, options)
    : options.req.t('validation:required')

// A script in a link would run with the rights of whoever presses it.
const address: TextFieldSingleValidation = (value, options) =>
  value && !/^(https?:|mailto:|tel:|\/)/i.test(value)
    ? 'An address starts with https://, mailto:, tel: or /.'
    : text(value, options)

const to =
  (type: string): Condition =>
  (_, siblingData) =>
    siblingData?.type === type

// Foot buttons, each a link after Payload's website template: to a window, a file to download, or an address.
export function buttons(name: string): ArrayField {
  return {
    name,
    type: 'array',
    label: 'Buttons',
    labels: { singular: 'Button', plural: 'Buttons' },
    maxRows: 3,
    admin: { description: 'The first is the main one.' },
    fields: [
      {
        name: 'type',
        type: 'radio',
        label: 'Links to',
        defaultValue: 'window',
        options: [
          { label: 'A window', value: 'window' },
          { label: 'A file', value: 'media' },
          { label: 'An address', value: 'address' },
        ],
        admin: { layout: 'horizontal' },
      },
      {
        type: 'row',
        fields: [
          {
            name: 'window',
            type: 'relationship',
            relationTo: 'windows',
            required: true,
            admin: { condition: to('window'), width: '50%' },
          },
          {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            label: 'File',
            required: true,
            admin: { condition: to('media'), width: '50%' },
          },
          {
            name: 'url',
            type: 'text',
            label: 'Address',
            required: true,
            validate: address,
            admin: { condition: to('address'), width: '50%' },
          },
          {
            name: 'label',
            type: 'text',
            maxLength: 20,
            validate: label,
            admin: { description: 'On a link to a window, empty is its title.', width: '50%' },
          },
        ],
      },
    ],
  }
}
