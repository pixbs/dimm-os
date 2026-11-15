import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
  versions: false,
}
