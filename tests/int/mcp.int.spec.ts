import config from '@payload-config'
import { getAuthorizedMCP } from '@payloadcms/plugin-mcp/internal'
import { createPayloadRequest, getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

let payload: Payload

const emails = ['mcp-admin@example.com', 'mcp-content@example.com']
const apiKey = 'a-local-api-key-for-the-mcp-content-user'
const headers = { Authorization: `users API-Key ${apiKey}` }

const rest = (route: string, init?: RequestInit) =>
  handleEndpoints({ config, request: new Request(`http://localhost:3000/api${route}`, init) })

const removeUsers = () =>
  payload.delete({ collection: 'users', overrideAccess: true, where: { email: { in: emails } } })

beforeAll(async () => {
  payload = await getPayload({ config })
  await removeUsers()
  const create = (email: string, role: User['role'], key?: string) =>
    payload.create({
      collection: 'users',
      data: { email, password: 'a-local-password', role, ...(key ? { apiKey: key } : {}) },
      depth: 0,
      draft: false,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: true,
    })
  // The admin first, since the first user of an empty database is always the admin.
  await create(emails[0], 'admin')
  await create(emails[1], 'content', apiKey)
})

afterAll(async () => {
  await removeUsers()
})

describe('MCP', () => {
  it("lists with the content user's key only the tools of Windows, Media, Forms and Site, and none deletes", async () => {
    const req = await createPayloadRequest({ payload, req: { headers: new Headers(headers) } })
    const { items } = await getAuthorizedMCP({ overrideAccess: false, req })
    expect(req.user?.email).toBe(emails[1])

    const targets = new Set(
      items.flatMap((item) =>
        item.type === 'collectionTool'
          ? [item.collectionSlug]
          : item.type === 'globalTool'
            ? [item.globalSlug]
            : [],
      ),
    )
    expect([...targets].sort()).toEqual(['forms', 'media', 'site', 'windows'])
    expect(items.filter((item) => item.configKey === 'delete')).toEqual([])
    expect(
      items.some((item) => item.type === 'collectionTool' && item.mcpName === 'updateDocument'),
    ).toBe(true)
  })

  it('keeps the saved instructions from anyone not signed in', async () => {
    // A signed-in read creates the entry of each collection and global.
    const signedIn = await rest('/payload-llm-instructions?depth=0&limit=0', { headers })
    expect(signedIn.status).toBe(200)
    const ids = (await signedIn.json()).docs.map(({ id }: { id: string }) => id)
    expect(ids).toContain('collection-windows')

    expect((await rest('/payload-llm-instructions?depth=0')).status).toBe(403)
    expect((await rest('/payload-llm-instructions/collection-windows?depth=0')).status).toBe(403)
  })
})
