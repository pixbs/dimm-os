import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { sharpTransformer } from '@payloadcms/transformer-sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { forms } from './collections/Forms'
import { Media } from './collections/Media'
import { Senders } from './collections/Senders'
import { Users } from './collections/Users'
import { Visitors } from './collections/Visitors'
import { Windows } from './collections/Windows'
import { Site } from './globals/Site'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    // Payload's own picture: Gravatar would send a hash of the address to another site, which the policy blocks.
    avatar: 'default',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Windows, Media, Users, Visitors, Senders],
  editor: lexicalEditor(),
  // Without a key, as in a local sandbox, Payload writes the mail to its log.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.RESEND_FROM_ADDRESS || '',
        defaultFromName: process.env.RESEND_FROM_NAME || '',
      })
    : undefined,
  globals: [Site],
  graphQL: { disable: true },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  jobs: {
    access: {
      // Vercel's cron sends CRON_SECRET as a bearer token.
      run: ({ req }) =>
        Boolean(req.user) ||
        (Boolean(process.env.CRON_SECRET) &&
          req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`),
    },
    tasks: [
      {
        slug: 'cleanup',
        // Queued by the daily cron's call for its next day, and run by the call of that day.
        schedule: [{ cron: '0 3 * * *', queue: 'default' }],
        outputSchema: [
          { name: 'submissions', type: 'number', required: true },
          { name: 'visitors', type: 'number', required: true },
          { name: 'senders', type: 'number', required: true },
        ],
        handler: async ({ req }) => {
          const { cleanup } = await import('./data/cleanup')
          return { output: await cleanup(req) }
        },
        onFail: async ({ job, req }) => {
          const { cleanupFailed } = await import('./data/cleanup')
          await cleanupFailed(req, job.id)
        },
      },
    ],
  },
  localization: {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'de', label: 'Deutsch' },
    ],
    fallback: false,
    defaultLocale: 'en',
  },
  // Only the Next.js server loads src/data: the CLI runs onInit too, without the server-only condition.
  onInit: async (payload) => {
    if (!process.env.NEXT_RUNTIME) return
    const { createFirstAdmin } = await import('./data/first-admin')
    await createFirstAdmin(payload)
  },
  plugins: [formBuilderPlugin(forms), mcpPlugin({})],
  // Without a token, as in a local sandbox, files stay on the disk.
  storage: [
    vercelBlobStorage({
      clientUploads: true,
      // A file is public at the store, under the random folder Payload gives each upload.
      collections: { media: { disablePayloadAccessControl: true } },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
  upload: {
    transformers: [
      sharpTransformer({
        collections: {
          // The tiny picture a picture resolves from while it loads, and the picture a shared link shows.
          media: {
            variants: [
              { name: 'tiny', width: 32 },
              { name: 'share', width: 1200, height: 630 },
            ],
          },
        },
      }),
    ],
  },
})
