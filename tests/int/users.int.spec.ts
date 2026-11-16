import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

let payload: Payload

const emails = ['content@example.com', 'other@example.com']

describe('a content user', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    await payload.delete({
      collection: 'users',
      depth: 0,
      overrideAccess: true,
      where: { email: { in: emails } },
    })
  })

  it('edits windows and Site, and reaches no other user', async () => {
    const create = (email: string, role: 'admin' | 'content') =>
      payload.create({
        collection: 'users',
        data: { email, password: 'a-local-password', role },
        depth: 0,
        draft: false,
        fallbackLocale: false,
        locale: 'en',
        overrideAccess: true,
      })
    // The admin first, since the first user of an empty database is always the admin.
    await create(emails[1], 'admin')
    const user = await create(emails[0], 'content')
    expect(user.role).toBe('content')
    const as = {
      depth: 0,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      user,
    } as const

    const { docs } = await payload.find({ collection: 'users', ...as })
    expect(docs.map((one) => one.email)).toEqual([user.email])
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'third@example.com', password: 'a-local-password', role: 'content' },
        draft: false,
        ...as,
      }),
    ).rejects.toThrow()

    const window = await payload.create({
      collection: 'windows',
      data: { title: 'Written by content' },
      draft: true,
      ...as,
    })
    await payload.delete({ collection: 'windows', id: window.id, ...as })
    const site = { name: 'A site', email: 'site@example.com', place: 'Somewhere' } as const
    await payload.updateGlobal({
      slug: 'site',
      data: { ...site, timezone: 'Europe/London' },
      draft: false,
      ...as,
    })
  })
})
