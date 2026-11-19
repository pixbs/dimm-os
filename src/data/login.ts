import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { SENDER_WINDOW } from '@/collections/Senders'
import { keyed } from '@/collections/Visitors'
import { senderKey } from '@/data/senders'
import type { Visitor } from '@/payload-types'

// A person mistypes a few times; a run of wrong passwords past that is a machine, held off for the window.
const TRIES = 10
const WINDOW = 15 * 60 * 1000

// A visitor with the keyed hash of their password, which no API shows.
type Kept = Visitor & { hash: string }

const read = { depth: 0, limit: 1, overrideAccess: true, pagination: false, showHiddenFields: true }

// The password's hash is signed in, so a new password ends the cookies given for the old one.
const signature = (payload: Payload, id: number, end: number, hash: string) =>
  createHmac('sha256', payload.secret).update(`${id}.${end}.${hash}`).digest('base64url')

// Each wrong password is a row of the senders' table under a keyed hash of where it came from, never the address
// itself, so tries sent at once are all counted; rows past the senders' window go at the next wrong try.
async function limited(payload: Payload, sender: string | null, failed: boolean): Promise<boolean> {
  if (!sender) return false
  const key = senderKey(payload, sender, 'login\n')
  const now = Date.now()
  if (failed) {
    await payload.delete({
      collection: 'senders',
      where: { createdAt: { less_than: new Date(now - SENDER_WINDOW).toISOString() } },
      depth: 0,
      overrideAccess: true,
    })
    await payload.create({ collection: 'senders', data: { key }, depth: 0, overrideAccess: true })
  }
  const { totalDocs } = await payload.count({
    collection: 'senders',
    where: {
      key: { equals: key },
      createdAt: { greater_than: new Date(now - WINDOW).toISOString() },
    },
    overrideAccess: true,
  })
  return totalDocs >= TRIES
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
