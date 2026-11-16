import type { CollectionConfig } from 'payload'

import { signedIn, signedInOrSite } from '@/access'
import { revalidateChange, revalidateDelete } from '@/hooks/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: signedIn,
    read: signedInOrSite,
    update: signedIn,
    delete: signedIn,
  },
  admin: { group: 'Content' },
  authorship: false,
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'live',
      type: 'select',
      label: 'Live picture',
      options: [
        { label: '404', value: 'not-found' },
        { label: 'Postmark', value: 'postmark' },
        { label: 'Portrait', value: 'portrait' },
      ],
      admin: { description: 'Drawn by the system over the file, which is its still.' },
    },
  ],
  hooks: {
    afterChange: [revalidateChange],
    afterDelete: [revalidateDelete],
  },
  upload: { focalPoint: true },
  versions: false,
}
