import type { CollectionConfig } from 'payload'

import { signedIn, signedInOrSite } from '@/access'
import { revalidateChange, revalidateDelete } from '@/hooks/revalidate'
import { forAgents } from '@/i18n/voice'

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
  llmInstructions: forAgents(
    'Media',
    '',
    '- alt says what the picture shows, in one sentence.',
    '- A caption belongs to the section that shows the picture, not to the picture.',
  ),
  upload: {
    focalPoint: true,
    // A picture too large to send inline comes by address, from this one host only.
    pasteURL: process.env.MEDIA_URL_HOST
      ? { allowList: [{ hostname: process.env.MEDIA_URL_HOST, protocol: 'https' }] }
      : undefined,
  },
  versions: false,
}
