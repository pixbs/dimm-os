import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { keyed } from '@/collections/Visitors'
import type { Visitor } from '@/payload-types'

// A person mistypes a few times; a run of wrong passwords past that is a machine, held off for the window.
const TRIES = 10
const WINDOW = 15 * 60 * 1000
const TRIED = 'login-tries'

type Tries = Record<string, { count: number; since: number }>

// A visitor with the keyed hash of their password, which no API shows.
type Kept = Visitor & { hash: string }

const read = { depth: 0, limit: 1, overrideAccess: true, pagination: false, showHiddenFields: true }

// The password's hash is signed in, so a new password ends the cookies given for the old one.
const signature = (payload: Payload, id: number, end: number, hash: string) =>
  createHmac('sha256', payload.secret).update(`${id}.${end}.${hash}`).digest('base64url')

// Wrong passwords are counted under a keyed hash of where they came from, never the address itself, and a count
// past its window is dropped whenever another is written.
async function limited(payload: Payload, sender: string | null, failed: boolean): Promise<boolean> {
  if (!sender) return false
  const key = createHmac('sha256', payload.secret).update(sender).digest('hex')
  const now = Date.now()
  const all = (await payload.kv.get<Tries>(TRIED)) ?? {}
  const tries = Object.fromEntries(
    Object.entries(all).filter(([, one]) => now - one.since < WINDOW),
  )
  if (failed) {
    tries[key] = { count: (tries[key]?.count ?? 0) + 1, since: tries[key]?.since ?? now }
    await payload.kv.set(TRIED, tries)
  }
  return (tries[key]?.count ?? 0) >= TRIES
}

// The cookie for the visitor a password belongs to, and the day it ends. An empty, a wrong and an expired password
// take the same way to the same answer, and nothing records a visitor who came in.
export async function signIn(
  password: string,
  sender: string | null,
): Promise<{ value: string; expires: Date } | 'limited' | null> {
  const payload = await getPayload({ config })
  if (await limited(payload, sender, false)) return 'limited'

  const { docs } = await payload.find({
    collection: 'visitors',
    where: { hash: { equals: await keyed(payload.secret, password) } },
    ...read,
  })
  const visitor = docs[0] as Kept | undefined
  const end = visitor ? Date.parse(visitor.expires) : 0
  if (!visitor || !(end > Date.now())) {
    await limited(payload, sender, true)
    return null
  }
  return {
    value: `${visitor.id}.${end}.${signature(payload, visitor.id, end, visitor.hash)}`,
    expires: new Date(end),
  }
}

// The visitor a cookie names, while its signature holds and neither its own end date nor the visitor's has passed.
export async function visitorOf(cookie: string): Promise<Visitor | null> {
  const [id, end, signed = ''] = cookie.split('.')
  if (!/^\d+$/.test(id) || !(Number(end) > Date.now())) return null

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'visitors',
    where: { id: { equals: Number(id) } },
    ...read,
  })
  const visitor = docs[0] as Kept | undefined
  if (!visitor || !(Date.parse(visitor.expires) > Date.now())) return null

  const [given, ours] = [signed, signature(payload, visitor.id, Number(end), visitor.hash)].map(
    (one) => Buffer.from(one),
  )
  if (given.length !== ours.length || !timingSafeEqual(given, ours)) return null
  // The hash stays here: a view holds the visitor's name and windows alone.
  const { hash: _, ...known } = visitor
  return known
}
