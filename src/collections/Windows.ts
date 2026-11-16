import {
  APIError,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type Condition,
  type Where,
} from 'payload'

import { signedIn } from '@/access'
import { icons } from '@/ds/atoms/icons'
import { buttons } from '@/fields/link'
import { facts } from '@/fields/facts'
import { revalidateChange, revalidateDelete } from '@/hooks/revalidate'
import { languages } from '@/i18n/address'
import { systemKeys } from '@/i18n/keys'

// The names a window's slug may not take: the system's paths, the language codes and the site's own routes.
const reserved = [
  ...['preferences', 'hotkeys', 'about', 'accessibility', 'cookies'],
  ...languages,
  ...['login', 'admin', 'api', 'licenses', 'view', 'catalogue'],
]

// The system links to these three ordinary windows by their slugs; the two legal ones stay shown and published.
const legal = ['imprint', 'privacy-policy']
const fixed = ['404', ...legal]

// A letter the system already answers to opens no window.
const systemLetters: string[] = Object.values(systemKeys).flatMap((keys) =>
  keys.length === 1 && /^[A-Z]$/.test(keys[0]) ? [keys[0]] : [],
)

const onItem: Condition = (data) => Boolean(data?.parent)
const onWindow: Condition = (data) => !data?.parent

// Unpublishing is a save that asks for a draft without saving one, in one language or in all of them.
const keepLegalPublished: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'update') return args
  const { data, draft, id, unpublishAllLocales, where } = args as {
    data?: { _status?: string }
    draft?: boolean
    id?: number | string
    unpublishAllLocales?: boolean
    where?: Where
  }
  if (!unpublishAllLocales && (data?._status !== 'draft' || draft)) return args

  const { totalDocs } = await req.payload.count({
    collection: 'windows',
    // Slugs and the tree are shared by both languages.
    locale: 'en',
    overrideAccess: true,
    req,
    where: { and: [id ? { id: { equals: id } } : (where ?? {}), { slug: { in: legal } }] },
  })
  if (totalDocs)
    throw new APIError('The imprint and the privacy policy stay published.', 403, null, true)
  return args
}

export const Windows: CollectionConfig = {
  slug: 'windows',
  access: {
    create: signedIn,
    read: signedIn,
    readVersions: signedIn,
    update: signedIn,
    delete: ({ req }) => Boolean(req.user) && { slug: { not_in: legal } },
  },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'kind', '_status', 'updatedAt'],
  },
  authorship: false,
  fields: [
    { name: 'title', type: 'text', localized: true, maxLength: 24, required: true },
    {
      type: 'tabs',
      // The tab Sections, a localised blocks field, comes with its first block: Payload's admin fails on one without blocks.
      tabs: [
        {
          label: 'Window',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'paper',
                  type: 'checkbox',
                  admin: { description: 'Drawn as a paper record.', width: '50%' },
                },
                {
                  name: 'stamp',
                  type: 'text',
                  admin: { condition: (data) => Boolean(data?.paper), width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'width',
                  type: 'number',
                  label: 'Width in pixels',
                  min: 1,
                  admin: { condition: onWindow, width: '50%' },
                },
                {
                  name: 'height',
                  type: 'number',
                  label: 'Height in pixels',
                  min: 1,
                  admin: { condition: onWindow, width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'oneSize',
                  type: 'checkbox',
                  label: 'One size',
                  admin: {
                    condition: onWindow,
                    description: 'Neither resized nor made full screen.',
                    width: '50%',
                  },
                },
                {
                  name: 'openAtStart',
                  type: 'checkbox',
                  label: 'Open at start',
                  admin: {
                    condition: onWindow,
                    description: 'Opens on the desk at /.',
                    width: '50%',
                  },
                },
              ],
            },
            { ...buttons('actions'), localized: true },
            {
              name: 'aside',
              type: 'group',
              localized: true,
              fields: [
                {
                  name: 'type',
                  type: 'radio',
                  label: 'Shows',
                  defaultValue: 'none',
                  options: [
                    { label: 'Nothing', value: 'none' },
                    { label: 'Contents, at the start', value: 'contents' },
                    { label: 'Record card, at the end', value: 'record' },
                  ],
                  admin: { layout: 'horizontal' },
                },
                ...[facts('facts', 'Facts'), buttons('actions')].map((field) => ({
                  ...field,
                  admin: {
                    ...field.admin,
                    condition: (_: unknown, siblingData: { type?: string }) =>
                      siblingData?.type === 'record',
                  },
                })),
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'tile',
                  type: 'select',
                  label: 'Shortcut tile',
                  options: [
                    { label: 'Orange', value: 'orange' },
                    { label: 'Blue', value: 'blue' },
                    { label: 'Mint', value: 'mint' },
                    { label: 'Paper', value: 'paper' },
                    { label: 'Raised', value: 'raised' },
                  ],
                  admin: { width: '33%' },
                },
                {
                  name: 'icon',
                  type: 'select',
                  label: 'Shortcut icon',
                  options: Object.keys(icons),
                  admin: { description: 'Empty, no shortcut on the desk.', width: '33%' },
                },
                {
                  name: 'key',
                  type: 'text',
                  hooks: { beforeChange: [({ value }) => value?.toUpperCase()] },
                  validate: (value: null | string | undefined) =>
                    !value ||
                    (/^[A-Z]$/.test(value) && !systemLetters.includes(value)) ||
                    `One letter, other than ${systemLetters.join(', ')}.`,
                  admin: { description: 'The letter that opens the window.', width: '33%' },
                },
              ],
            },
          ],
        },
        {
          label: 'Listing',
          fields: [
            {
              name: 'description',
              type: 'textarea',
              localized: true,
              maxLength: 160,
              admin: {
                description:
                  'For previews, search and sharing. Empty, the text of the first Header.',
              },
            },
            {
              name: 'cover',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Empty, the first picture.' },
            },
            { name: 'caption', type: 'text', localized: true, admin: { condition: onItem } },
            {
              name: 'headline',
              type: 'text',
              localized: true,
              admin: { condition: onItem, description: 'Empty, the title of the first Header.' },
            },
            { name: 'note', type: 'text', localized: true, admin: { condition: onItem } },
            { ...facts('facts', 'Facts'), localized: true, admin: { condition: onItem } },
            {
              name: 'related',
              type: 'relationship',
              relationTo: 'windows',
              hasMany: true,
              admin: { condition: onItem },
            },
          ],
        },
      ],
    },
    {
      name: 'slug',
      type: 'slug',
      useAsSlug: 'title',
      validate: (value: null | string | undefined) =>
        !value || !reserved.includes(value) || 'This name belongs to the system.',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'windows',
      hasMany: false,
      admin: { position: 'sidebar' },
      // A window and its items: two levels.
      filterOptions: ({ id }) => ({ parent: { exists: false }, id: { not_equals: id } }),
      validate: async (value, { data, id, req }) => {
        if (!value) return true
        if (fixed.includes((data as { slug?: string }).slug ?? ''))
          return 'This window stays on top.'
        const parent = await req.payload.findByID({
          collection: 'windows',
          id: typeof value === 'object' ? (value as unknown as { id: number }).id : value,
          depth: 0,
          draft: true,
          fallbackLocale: false,
          locale: 'en',
          overrideAccess: true,
          req,
          select: { parent: true },
        })
        if (parent.parent) return 'An item holds no items.'
        if (!id) return true
        const { totalDocs } = await req.payload.count({
          collection: 'windows',
          locale: 'en',
          overrideAccess: true,
          req,
          where: { parent: { equals: id } },
        })
        return totalDocs === 0 || 'A window with items is no item.'
      },
    },
    {
      name: 'kind',
      type: 'text',
      label: 'File type',
      admin: { position: 'sidebar', description: 'Shown after the title in the bar: grow.case.' },
    },
    {
      name: 'hidden',
      type: 'checkbox',
      validate: (value: boolean | null | undefined, { data }) =>
        !value ||
        !legal.includes((data as { slug?: string }).slug ?? '') ||
        'The imprint and the privacy policy are always shown.',
      admin: { position: 'sidebar', description: 'Not shown to guests, nor are its items.' },
    },
  ],
  hierarchy: { parentFieldName: 'parent', slugField: 'slug' },
  hooks: {
    afterChange: [revalidateChange],
    afterDelete: [revalidateDelete],
    beforeOperation: [keepLegalPublished],
  },
  orderable: true,
  versions: { drafts: { autosave: true }, maxPerDoc: 100 },
}
