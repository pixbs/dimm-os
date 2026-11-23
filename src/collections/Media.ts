import type { CollectionConfig, TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

import { signedIn, signedInOrSite } from '@/access'
import { revalidateChange, revalidateDelete } from '@/hooks/revalidate'
import { forAgents } from '@/mcp'

// German that is not written yet shows the English, so only English is required.
const alt: TextFieldSingleValidation = (value, options) =>
  text(value, { ...options, required: options.req.locale === 'en' })

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: signedIn,
    read: signedInOrSite,
    update: signedIn,
    delete: signedIn,
  },
  // A card the system drew is not listed, here or where a picture is picked.
  admin: { group: 'Content', baseFilter: () => ({ drawn: { exists: false } }) },
  authorship: false,
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      validate: alt,
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
    {
      // What a card was drawn from, which marks it as one: only the system writes it, and the list filters by it.
      name: 'drawn',
      type: 'json',
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
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
    '- A caption belongs to the section that shows the picture.',
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
