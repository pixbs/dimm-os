import { scrypt } from 'node:crypto'

import type { CollectionConfig, PayloadRequest, TextFieldSingleValidation } from 'payload'

import { isAdmin } from '@/access'
import { nested } from '@/hooks/nested'

const DAY = 24 * 60 * 60 * 1000

// The same for the same password, so it finds the visitor; keyed with Payload's secret and slow, so a copy of the
// table gives no password away.
const keyed = (req: PayloadRequest, password: string) =>
  new Promise<string>((resolve, reject) =>
    scrypt(password, req.payload.secret, 32, (error, key) =>
      error ? reject(error) : resolve(key.toString('hex')),
    ),
  )

// A new visitor needs a password; a saved one keeps theirs unless another is typed.
const password: TextFieldSingleValidation = async (value, { id, operation, req }) => {
  if (!value) return operation === 'create' ? req.t('validation:required') : true
  if (value.length < 15) return 'At least 15 characters.'
  const { totalDocs } = await req.payload.count({
    collection: 'visitors',
    ...nested(req),
    overrideAccess: true,
    where: {
      hash: { equals: await keyed(req, value) },
      ...(id ? { id: { not_equals: id } } : {}),
    },
  })
  return totalDocs ? 'This password is in use.' : true
}

// An invited reader of hidden windows, and not a Payload user: no login, no admin, no API.
export const Visitors: CollectionConfig = {
  slug: 'visitors',
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    group: 'People',
    useAsTitle: 'name',
    defaultColumns: ['name', 'expires'],
  },
  authorship: false,
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'password',
      type: 'text',
      virtual: true,
      validate: password,
      // Typed by the owner, though Payload makes a field that is not stored read-only.
      admin: {
        description: 'Kept only as a keyed hash; empty keeps the saved one.',
        readOnly: false,
      },
    },
    {
      name: 'hash',
      type: 'text',
      hidden: true,
      unique: true,
      hooks: {
        beforeChange: [
          async ({ req, siblingData, value }) =>
            typeof siblingData.password === 'string' && siblingData.password
              ? await keyed(req, siblingData.password)
              : value,
        ],
      },
    },
    {
      name: 'windows',
      type: 'relationship',
      relationTo: 'windows',
      hasMany: true,
      filterOptions: { hidden: { equals: true } },
      admin: { description: 'Hidden windows the visitor may open, each with its items.' },
    },
    {
      name: 'expires',
      type: 'date',
      required: true,
      defaultValue: () => new Date(Date.now() + 90 * DAY).toISOString(),
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
  ],
  versions: false,
}
