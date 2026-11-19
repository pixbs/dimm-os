import 'server-only'

import { createHmac } from 'node:crypto'

import type { Payload } from 'payload'

// Where a request came from, kept only as a keyed hash: enough to count one sender's tries, never the address. A kind
// keeps one limit's count apart from another's.
export const senderKey = (payload: Payload, sender: string, kind = '') =>
  createHmac('sha256', payload.secret).update(`${kind}${sender}`).digest('hex')
