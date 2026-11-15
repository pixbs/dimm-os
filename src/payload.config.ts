import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { sharpTransformer } from '@payloadcms/transformer-sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
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
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  // Loaded when Payload starts, so the CLI, which runs without the server-only condition, never imports it.
  onInit: async (payload) => (await import('./data/first-admin')).createFirstAdmin(payload),
  plugins: [mcpPlugin({})],
  upload: {
    transformers: [sharpTransformer()],
  },
})
