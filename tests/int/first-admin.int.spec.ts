import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { createFirstAdmin } from '@/data/first-admin'

let payload: Payload

const users = () => payload.find({ collection: 'users', depth: 0, overrideAccess: true })

describe('the first admin', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('is created from ADMIN_EMAIL and ADMIN_PASSWORD when there is no user', async () => {
    await payload.delete({
      collection: 'users',
      where: { id: { exists: true } },
      overrideAccess: true,
    })

    await createFirstAdmin(payload)

    expect((await users()).docs.map((user) => user.email)).toEqual([process.env.ADMIN_EMAIL])
    const { user } = await payload.login({
      collection: 'users',
      data: { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! },
      depth: 0,
      overrideAccess: true,
    })
    expect(user?.email).toBe(process.env.ADMIN_EMAIL)
  })

  it('is not created again once a user exists', async () => {
    await createFirstAdmin(payload)

    expect((await users()).totalDocs).toBe(1)
  })
})
