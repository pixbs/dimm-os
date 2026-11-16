import config from '@payload-config'
import { getPayload } from 'payload'

import { fill } from './neutral'

// Run after payload migrate:fresh, on a sandbox, CI's database or a preview's: never on production.
await fill(await getPayload({ config }))
process.exit(0)
