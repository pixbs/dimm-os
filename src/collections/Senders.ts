import type { CollectionConfig } from 'payload'

// How long a sender's messages count against the limit, and how long a row of one is kept.
export const SENDER_WINDOW = 60 * 60 * 1000

// One row for each message sent, under a keyed hash of where it came from and kept only for the limit's window, so
// the limit counts a sender's messages without the device's address ever being stored.
export const Senders: CollectionConfig = {
  slug: 'senders',
  access: {
    create: ({ req }) => req.context.viewer !== undefined,
    read: ({ req }) => req.context.viewer !== undefined,
    update: () => false,
    delete: ({ req }) => req.context.viewer !== undefined,
  },
  admin: { hidden: true },
  authorship: false,
  fields: [{ name: 'key', type: 'text', required: true, index: true }],
  versions: false,
}
