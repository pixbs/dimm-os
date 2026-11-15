import type { CollectionConfig } from 'payload'

// Only the Next.js server holds views to make stale, and only it may load src/data.
const revalidate = async () => {
  if (!process.env.NEXT_RUNTIME) return
  const { revalidateViews } = await import('../data/views')
  revalidateViews()
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: ({ req }) => Boolean(req.user),
    read: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  hooks: {
    afterChange: [revalidate],
    afterDelete: [revalidate],
  },
  upload: true,
  // Payload 4 versions a collection unless told not to, and the initial migration holds these tables.
  versions: true,
}
