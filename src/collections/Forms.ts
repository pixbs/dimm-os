import type { PluginConfig } from '@payloadcms/plugin-form-builder/types'

import { isAdmin, signedIn, signedInOrSite } from '@/access'

// The system says what happens after a send and mails Site's address, so a form holds only its fields and its button.
const owned = ['confirmationType', 'confirmationMessage', 'redirect', 'emails']

export const forms: PluginConfig = {
  // Each field the form organism draws; none of the system's own.
  fields: {
    text: true,
    email: true,
    textarea: true,
    number: true,
    date: true,
    select: true,
    radio: true,
    checkbox: true,
    message: true,
    country: false,
    state: false,
    payment: false,
    upload: false,
  },
  formOverrides: {
    access: { read: signedInOrSite, create: signedIn, update: signedIn, delete: signedIn },
    admin: { group: 'Content' },
    authorship: false,
    versions: false,
    fields: ({ defaultFields }) =>
      defaultFields.filter((field) => !('name' in field) || !owned.includes(field.name)),
  },
  formSubmissionOverrides: {
    // Written by the site's own code alone, read by the admin alone, and never changed.
    access: {
      create: ({ req }) => req.context.viewer !== undefined,
      read: isAdmin,
      update: () => false,
      delete: isAdmin,
    },
    admin: { group: 'Records' },
    authorship: false,
    versions: false,
  },
}
