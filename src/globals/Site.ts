import type { GlobalConfig } from 'payload'
import { defaultTimezones } from 'payload/shared'

import { signedIn, signedInOrSite } from '@/access'
import { facts } from '@/fields/facts'
import { buttons } from '@/fields/link'
import { dropBareIdsOfGlobal } from '@/hooks/relations'
import { revalidateGlobal } from '@/hooks/revalidate'
import { forAgents } from '@/mcp'

// The values the whole system shares. One document that saves directly.
export const Site: GlobalConfig = {
  slug: 'site',
  // The site's own code reads it under the windows' rule, so a hidden counted window stays absent.
  access: { read: signedInOrSite, readVersions: signedIn, update: signedIn },
  admin: { group: 'Content' },
  authorship: false,
  llmInstructions: forAgents(
    'Site',
    '',
    '- A boot row or plate mark has a label of one or two words and a value of five words at most.',
  ),
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'email', type: 'email', required: true, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'place', type: 'text', required: true, admin: { width: '50%' } },
        {
          name: 'timezone',
          type: 'select',
          options: defaultTimezones,
          required: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'counted',
      type: 'relationship',
      relationTo: 'windows',
      label: 'Counted collection',
      filterOptions: { parent: { exists: false } },
      admin: { description: 'Boot and About count its items.' },
    },
    {
      name: 'boot',
      type: 'array',
      label: 'Boot screen',
      labels: { singular: 'Row', plural: 'Rows' },
      localized: true,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'value', type: 'text', required: true },
            { name: 'status', type: 'text', required: true },
          ],
        },
      ],
    },
    { ...facts('about', 'About plate'), localized: true },
    {
      name: 'inside',
      type: 'group',
      label: 'Behind the About plate',
      fields: [
        { name: 'picture', type: 'upload', relationTo: 'media' },
        { name: 'title', type: 'text', localized: true },
        { name: 'text', type: 'textarea', localized: true },
        // The plate's own button that puts it back follows these.
        { ...buttons('actions'), localized: true, maxRows: 2 },
      ],
    },
  ],
  hooks: { afterChange: [revalidateGlobal], afterRead: [dropBareIdsOfGlobal] },
  versions: false,
}
