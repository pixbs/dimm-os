import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Visitor, Window } from '@/payload-types'

let payload: Payload

const names = ['Visitors, first', 'Visitors, second', 'Visitors, short', 'Visitors, shown']
const slugs = ['visitors-hidden', 'visitors-shown']
const DAY = 24 * 60 * 60 * 1000

let hidden: Window
let shown: Window

const window = (slug: string, isHidden: boolean) =>
  payload.create({
    collection: 'windows',
    data: { title: slug, slug, hidden: isHidden, _status: 'published' } as Window,
    depth: 0,
    draft: false,
    fallbackLocale: false,
    locale: 'en',
    overrideAccess: true,
  })

const save = (name: string, password: string | undefined, windows: number[] = [hidden.id]) =>
  payload.create({
    collection: 'visitors',
    data: { name, password, windows } as Visitor,
    depth: 0,
    overrideAccess: true,
  })

describe('a visitor', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    await payload.delete({
      collection: 'visitors',
      overrideAccess: true,
      where: { name: { in: names } },
    })
    await payload.delete({
      collection: 'windows',
      depth: 0,
      locale: 'en',
      overrideAccess: true,
      where: { slug: { in: slugs } },
    })
    hidden = await window(slugs[0], true)
    shown = await window(slugs[1], false)
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'visitors',
      overrideAccess: true,
      where: { name: { in: names } },
    })
    await payload.delete({
      collection: 'windows',
      depth: 0,
      locale: 'en',
      overrideAccess: true,
      where: { slug: { in: slugs } },
    })
  })

  it('is refused a password under 15 characters, or none', async () => {
    await expect(save(names[2], 'fourteen-chars')).rejects.toThrow('Password')
    await expect(save(names[2], undefined)).rejects.toThrow('Password')
  })

  it('keeps only a keyed hash of the password, and a password in use is refused', async () => {
    const password = 'a-password-of-the-first'
    const before = Date.now()
    const first = await save(names[0], password)

    expect(first.password).toBeNull()
    expect(JSON.stringify(first)).not.toContain(password)
    expect(first).not.toHaveProperty('hash')
    const stored = await payload.db.findOne<Visitor>({
      collection: 'visitors',
      req: undefined,
      where: { id: { equals: first.id } },
    })
    expect(stored).not.toHaveProperty('password')
    expect(stored?.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(stored)).not.toContain(password)
    // Filled with 90 days from the day of saving.
    const expires = new Date(first.expires).getTime()
    expect(expires).toBeGreaterThanOrEqual(before + 90 * DAY)
    expect(expires).toBeLessThanOrEqual(Date.now() + 90 * DAY)

    await expect(save(names[1], password)).rejects.toThrow('Password')

    // Saved again without a password, the visitor keeps theirs, which stays taken.
    await payload.update({
      collection: 'visitors',
      id: first.id,
      data: { name: names[0], password },
      depth: 0,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'visitors',
      id: first.id,
      data: { name: names[0] },
      depth: 0,
      overrideAccess: true,
    })
    const again = await payload.db.findOne<Visitor>({
      collection: 'visitors',
      where: { id: { equals: first.id } },
    })
    expect(again?.hash).toBe(stored?.hash)
    await expect(save(names[1], password)).rejects.toThrow('Password')
    await save(names[1], 'a-password-of-the-second')
  })

  it('is offered only hidden windows', async () => {
    await expect(save(names[3], 'a-password-of-one-shown', [shown.id])).rejects.toThrow('Windows')
  })
})
