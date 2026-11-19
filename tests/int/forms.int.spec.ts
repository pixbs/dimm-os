import config from '@payload-config'
import { getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { send } from '@/data/send'
import type { Form } from '@/payload-types'

let payload: Payload
let form: Form

const TITLE = 'Forms, a test form'
const EMAILS = ['forms-admin@example.com', 'forms-content@example.com']
const KEY = 'a-local-api-key-for-the-forms-content-user'
const trusted = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const

const rest = (route: string, init?: RequestInit) =>
  handleEndpoints({ config, request: new Request(`http://localhost:3000/api${route}`, init) })

// Open as long as a person takes to type it.
const waited = 10_000

const stored = async () =>
  (
    await payload.find({
      collection: 'form-submissions',
      where: { form: { equals: form.id } },
      ...trusted,
    })
  ).docs

async function clean() {
  const { docs } = await payload.find({
    collection: 'forms',
    where: { title: { equals: TITLE } },
    ...trusted,
  })
  const ids = docs.map(({ id }) => id)
  await payload.delete({ collection: 'form-submissions', where: { form: { in: ids } }, ...trusted })
  await payload.delete({ collection: 'forms', where: { id: { in: ids } }, ...trusted })
  await payload.delete({ collection: 'users', where: { email: { in: EMAILS } }, ...trusted })
  await payload.delete({ collection: 'senders', where: { id: { exists: true } }, ...trusted })
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await clean()
  form = await payload.create({
    collection: 'forms',
    data: {
      title: TITLE,
      fields: [
        { blockType: 'text', name: 'name', label: 'Name' },
        { blockType: 'email', name: 'email', label: 'Email', required: true },
        { blockType: 'textarea', name: 'message', label: 'Message', required: true },
      ],
    },
    locale: 'en',
    ...trusted,
  })
})

afterAll(clean)

describe('a message sent through a form', () => {
  it('names what is missing and what is not an address, and keeps nothing', async () => {
    const sent = await send({
      form: form.id,
      lang: 'en',
      values: { name: 'Ana', email: 'ana@', message: '' },
      trap: '',
      waited,
    })
    expect(sent).toEqual({ ok: false, missing: ['message'], invalid: ['email'] })
    expect(await stored()).toHaveLength(0)
  })

  it('is kept as what was typed and nothing else', async () => {
    const sent = await send({
      form: form.id,
      lang: 'en',
      values: { name: '', email: 'ana@example.com', message: 'Hello', extra: 'not a field' },
      trap: '',
      waited,
    })
    expect(sent).toEqual({ ok: true })
    const [one] = await stored()
    expect(one.submissionData?.map(({ field, value }) => [field, value])).toEqual([
      ['email', 'ana@example.com'],
      ['message', 'Hello'],
    ])
    expect(Object.keys(one).sort()).toEqual([
      'createdAt',
      'form',
      'id',
      'submissionData',
      'updatedAt',
    ])
  })

  it('is answered as sent and dropped when the hidden field is filled or it comes too soon', async () => {
    const before = (await stored()).length
    const values = { email: 'bot@example.com', message: 'Buy' }
    const base = { form: form.id, lang: 'en' as const, values }
    expect(await send({ ...base, trap: 'https://spam.example', waited })).toEqual({
      ok: true,
    })
    expect(await send({ ...base, trap: '', waited: 0 })).toEqual({ ok: true })
    expect(await stored()).toHaveLength(before)
  })
})

describe('a sender', () => {
  const message = (sender: string) =>
    send({
      form: form.id,
      lang: 'en',
      values: { email: 'ana@example.com', message: 'Hello again' },
      trap: '',
      waited,
      sender,
    })

  it('sends a few messages, is refused past the limit and keeps nothing more, and others are unaffected', async () => {
    const sender = '198.51.100.4'
    for (let at = 0; at < 5; at++) expect(await message(sender)).toEqual({ ok: true })
    const before = (await stored()).length
    expect(await message(sender)).toEqual({ ok: false, limited: true })
    expect(await stored()).toHaveLength(before)
    expect(await message('203.0.113.7')).toEqual({ ok: true })
  })

  it('is kept as a keyed hash, never as its address', async () => {
    const { docs } = await payload.find({ collection: 'senders', limit: 100, ...trusted })
    expect(docs.length).toBeGreaterThan(0)
    for (const { key } of docs) {
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(key).not.toContain('203.0.113.7')
    }
  })
})

describe('the content user', () => {
  it('edits forms and reads no submission', async () => {
    const user = (email: string, role: 'admin' | 'content', apiKey?: string) =>
      payload.create({
        collection: 'users',
        data: { email, password: 'a-local-password', role, ...(apiKey ? { apiKey } : {}) },
        ...trusted,
      })
    // The admin first, since the first user of an empty database is always the admin.
    await user(EMAILS[0], 'admin')
    expect((await user(EMAILS[1], 'content', KEY)).role).toBe('content')
    const headers = { Authorization: `users API-Key ${KEY}` }
    expect((await rest(`/forms/${form.id}?depth=0`, { headers })).status).toBe(200)
    expect((await rest('/form-submissions?depth=0', { headers })).status).toBe(403)
    const [one] = await stored()
    expect((await rest(`/form-submissions/${one.id}?depth=0`, { headers })).status).toBe(403)
  })

  it('a guest of the API writes no submission', async () => {
    const response = await rest('/form-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form: form.id,
        submissionData: [{ field: 'email', value: 'a@b.co' }],
      }),
    })
    expect(response.status).toBe(403)
  })
})
