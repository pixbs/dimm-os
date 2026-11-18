import 'server-only'

import { createHmac } from 'node:crypto'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Language } from '@/i18n/address'

// A person takes longer than this to fill a form, and a form left open longer is opened again.
const QUICKEST = 3000
const LONGEST = 24 * 60 * 60 * 1000

// One sender's messages within a window: a person writes a few, a burst past them is a machine.
const LIMIT = 5
const WINDOW = 60 * 60 * 1000

const address = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type Sent =
  | { ok: true }
  | { ok: false; missing: string[]; invalid: string[] }
  | { ok: false; limited: true }

// A message from a form: checked against the form's own fields, kept as a submission of what was typed alone, and
// mailed to Site's address. What a bot fills, or sends too soon, is answered as sent and dropped; how long the form
// was open is measured on the visitor's own clock, so a device whose clock differs from the server's is no bot.
export async function send(input: {
  form: unknown
  lang: Language
  values: Record<string, unknown>
  trap: unknown
  waited: unknown
  // Where it came from, as the request says, or null where it says nothing.
  sender?: string | null
}): Promise<Sent | null> {
  const waited = Number(input.waited)
  if (input.trap || !(waited >= QUICKEST && waited <= LONGEST)) return { ok: true }

  const payload = await getPayload({ config })
  // The site's own code reads and writes, for a guest.
  const site = { context: { viewer: null }, overrideAccess: false } as const
  const form = await payload
    .findByID({
      collection: 'forms',
      id: Number(input.form),
      depth: 0,
      fallbackLocale: false,
      locale: input.lang,
      ...site,
    })
    .catch(() => null)
  if (!form) return null

  const typed = (form.fields ?? []).flatMap((field) => {
    if (field.blockType === 'message') return []
    const raw = input.values[field.name]
    const value =
      field.blockType === 'checkbox' ? (raw === true ? 'true' : '') : String(raw ?? '').trim()
    return [{ ...field, value }]
  })
  const missing = typed.filter(({ required, value }) => required && !value).map(({ name }) => name)
  const invalid = typed
    .filter(({ blockType, value }) => blockType === 'email' && value && !address.test(value))
    .map(({ name }) => name)
  if (missing.length || invalid.length) return { ok: false, missing, invalid }

  // A sender is counted under a keyed hash of where it came from, and rows past the window are gone at each send.
  if (input.sender) {
    const since = new Date(Date.now() - WINDOW).toISOString()
    const key = createHmac('sha256', payload.secret).update(input.sender).digest('hex')
    await payload.delete({
      collection: 'senders',
      where: { createdAt: { less_than: since } },
      depth: 0,
      ...site,
    })
    const { totalDocs } = await payload.count({
      collection: 'senders',
      where: { key: { equals: key } },
      ...site,
    })
    if (totalDocs >= LIMIT) return { ok: false, limited: true }
    await payload.create({ collection: 'senders', data: { key }, depth: 0, ...site })
  }

  const filled = typed.filter(({ value }) => value)
  await payload.create({
    collection: 'form-submissions',
    data: {
      form: form.id,
      submissionData: filled.map(({ name, value }) => ({ field: name, value })),
    },
    depth: 0,
    ...site,
  })
  const { email } = await payload.findGlobal({
    slug: 'site',
    depth: 0,
    draft: false,
    fallbackLocale: false,
    locale: input.lang,
    select: { email: true },
    ...site,
  })
  const from = filled.find(({ blockType }) => blockType === 'email')?.value
  // The submission is kept, so a mail that does not go out is in the log, and the message is not lost.
  await payload
    .sendEmail({
      to: email,
      replyTo: from,
      subject: form.title,
      text: filled.map(({ label, name, value }) => `${label || name}: ${value}`).join('\n\n'),
    })
    .catch((err: unknown) => payload.logger.error({ err, msg: 'A form message was not mailed.' }))
  return { ok: true }
}
