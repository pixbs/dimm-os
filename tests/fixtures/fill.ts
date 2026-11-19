import config from '@payload-config'
import { getPayload } from 'payload'

import { fill } from './neutral'

// Runs only on a database of this machine, a sandbox or ci's: a preview's or production's sits on Neon and is never filled.
const { hostname } = new URL(process.env.DATABASE_URL || 'postgres://unknown')
if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
  console.error(`The fixture fills only a local database, not one on ${hostname}.`)
  process.exit(1)
}

await fill(await getPayload({ config }))
process.exit(0)
