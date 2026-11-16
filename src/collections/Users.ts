import type { Access, CollectionConfig } from 'payload'

import { isAdmin, signedIn } from '@/access'
import { nested } from '@/hooks/nested'

// The admin reaches every user; the content user, only their own account.
const selfOrAdmin: Access = ({ req }) =>
  isAdmin({ req }) || (req.user ? { id: { equals: req.user.id } } : false)

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: signedIn,
    create: isAdmin,
    read: selfOrAdmin,
    update: selfOrAdmin,
    delete: isAdmin,
  },
  admin: {
    group: 'People',
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  // A key lets an agent work over MCP as a user, with that user's access and no more.
  auth: { useAPIKey: true },
  authorship: false,
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'content',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Content', value: 'content' },
      ],
      saveToJWT: true,
      access: { create: isAdmin, update: isAdmin },
      admin: { description: 'Content edits Windows, Media and Site.' },
      hooks: {
        // The first user is the admin, as in Payload's templates.
        beforeChange: [
          async ({ operation, req, value }) =>
            operation === 'create' &&
            (await req.payload.count({ collection: 'users', ...nested(req), overrideAccess: true }))
              .totalDocs === 0
              ? 'admin'
              : value,
        ],
      },
    },
  ],
  versions: false,
}
