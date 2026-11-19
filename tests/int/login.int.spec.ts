import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { signIn, visitorOf } from '@/data/login'
import type { Visitor } from '@/payload-types'

let payload: Payload
let visitor: Visitor

const names = ['Login, invited', 'Login, expired']
const password = 'a-password-from-an-invite'
const gone = () =>
  payload.delete({ collection: 'visitors', overrideAccess: true, where: { name: { in: names } } })
const save = (data: Partial<Visitor>) =>
  payload.update({ collection: 'visitors', id: visitor.id, data, depth: 0, overrideAccess: true })

beforeAll(async () => {
  payload = await getPayload({ config })
  await gone()
  await payload.kv.delete('login-tries')
  visitor = await payload.create({
    collection: 'visitors',
    data: { name: names[0], password } as Visitor,
    depth: 0,
    overrideAccess: true,
  })
  await payload.create({
    collection: 'visitors',
    data: { name: names[1], password: `${password}, expired`, expires: '2020-01-01' } as Visitor,
    depth: 0,
    overrideAccess: true,
  })
})

afterAll(async () => {
  await gone()
  await payload.kv.delete('login-tries')
})

describe('the login', () => {
  it('shows the personal link once, in the answer to the save, with the privacy policy', async () => {
    const [link, policy] = visitor.link!.split('\n')
    expect(link).toMatch(/\/login#p=a-password-from-an-invite$/)
    expect(policy).toMatch(/\/privacy-policy$/)
    const again = await payload.findByID({
      collection: 'visitors',
      id: visitor.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(again.link ?? null).toBeNull()
  })

  it('gives the visitor a signed cookie that ends on their end date, and records nothing', async () => {
    const signed = await signIn(password, 'a sender')
    if (!signed || signed === 'limited') throw new Error('The password signs in.')
    expect(signed.expires.toISOString()).toBe(visitor.expires)
    expect(await visitorOf(signed.value)).toMatchObject({ id: visitor.id, name: names[0] })
    expect(await visitorOf(signed.value)).not.toHaveProperty('hash')
    expect(await payload.kv.get('login-tries')).toBeNull()
  })

  it('answers an empty, a wrong and an expired password alike, and writes none to a log', async () => {
    const said = [
      ...(['info', 'warn', 'error', 'debug'] as const).map((level) =>
        vi.spyOn(payload.logger, level),
      ),
      ...(['log', 'warn', 'error'] as const).map((level) => vi.spyOn(console, level)),
    ]
    const typed = ['', `${password}, wrong`, `${password}, expired`, password]
    const answers = await Promise.all(typed.map((one) => signIn(one, null)))
    expect(answers.slice(0, 3)).toEqual([null, null, null])
    expect(JSON.stringify(said.flatMap((spy) => spy.mock.calls))).not.toContain(password)
    vi.restoreAllMocks()
  })

  it('names no one with a changed cookie, after a new password, or past the end date', async () => {
    const signed = (await signIn(password, null)) as { value: string }
    const [id, end, signature] = signed.value.split('.')
    expect(await visitorOf(`${id}.${Number(end) + 1}.${signature}`)).toBeNull()
    expect(await visitorOf(`${Number(id) + 1}.${end}.${signature}`)).toBeNull()

    await save({ password: `${password}, new` } as Partial<Visitor>)
    expect(await visitorOf(signed.value)).toBeNull()
    await save({ password } as Partial<Visitor>)
    expect(await visitorOf(signed.value)).not.toBeNull()

    await save({ expires: new Date(Date.now() - 1000).toISOString() })
    expect(await visitorOf(signed.value)).toBeNull()
    expect(await signIn(password, null)).toBeNull()
    await save({ expires: visitor.expires })
  })

  it('holds a sender off after too many tries, under a keyed hash of where they came from', async () => {
    for (let tries = 0; tries < 10; tries++) expect(await signIn('', '203.0.113.7')).toBeNull()
    expect(await signIn(password, '203.0.113.7')).toBe('limited')
    expect(await signIn(password, '203.0.113.8')).not.toBe('limited')
    expect(JSON.stringify(await payload.kv.get('login-tries'))).not.toContain('203.0.113')
  })
})
